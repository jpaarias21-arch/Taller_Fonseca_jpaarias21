import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const getAdminClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const persistLog = async (payload: Record<string, unknown>) => {
  const admin = getAdminClient();
  if (!admin) return;

  try {
    await admin.from("whatsapp_envios").insert(payload);
  } catch (err) {
    console.error("No se pudo guardar log de WhatsApp:", err);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { to, message, order_id, estado, placa, cliente } = await req.json();

    if (!to || !message) {
      await persistLog({
        order_id: order_id || null,
        estado: estado || null,
        placa: placa || null,
        cliente: cliente || null,
        telefono: String(to || ""),
        mensaje: String(message || ""),
        status: "failed",
        error: "to and message are required"
      });

      return new Response(JSON.stringify({ ok: false, error: "to and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !phoneNumberId) {
      await persistLog({
        order_id: order_id || null,
        estado: estado || null,
        placa: placa || null,
        cliente: cliente || null,
        telefono: String(to),
        mensaje: String(message),
        status: "failed",
        error: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID"
      });

      return new Response(
        JSON.stringify({ ok: false, error: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const endpoint = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;

    const sendResp = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          body: message,
          preview_url: false
        }
      })
    });

    const result = await sendResp.json();

    if (!sendResp.ok) {
      await persistLog({
        order_id: order_id || null,
        estado: estado || null,
        placa: placa || null,
        cliente: cliente || null,
        telefono: String(to),
        mensaje: String(message),
        status: "failed",
        error: result?.error?.message || "WhatsApp API error",
        provider_response: result
      });

      return new Response(JSON.stringify({ ok: false, error: result?.error?.message || "WhatsApp API error", details: result }), {
        status: sendResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    await persistLog({
      order_id: order_id || null,
      estado: estado || null,
      placa: placa || null,
      cliente: cliente || null,
      telefono: String(to),
      mensaje: String(message),
      status: "sent",
      provider: "meta-whatsapp-business",
      provider_message_id: result?.messages?.[0]?.id || null,
      provider_response: result
    });

    return new Response(
      JSON.stringify({
        ok: true,
        provider: "meta-whatsapp-business",
        whatsapp_message_id: result?.messages?.[0]?.id || null,
        order_id: order_id || null,
        estado: estado || null,
        placa: placa || null,
        cliente: cliente || null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    await persistLog({
      telefono: "unknown",
      mensaje: "unknown",
      status: "failed",
      error: error?.message || "Unexpected error"
    });

    return new Response(JSON.stringify({ ok: false, error: error?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
