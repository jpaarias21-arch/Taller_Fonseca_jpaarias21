// @ts-ignore - Este import solo se resuelve en runtime Deno/Supabase Edge.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore - Import remoto soportado por Deno; TypeScript local no lo resuelve.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

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

const jsonResponse = (status: number, body: Record<string, unknown>) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
};

const safeJson = async (resp: Response) => {
  try {
    return await resp.json();
  } catch {
    return null;
  }
};

const sendViaMeta = async ({
  to,
  template_name,
  language_code,
  variables
}: {
  to: string;
  mode: string;
  template_name?: string;
  language_code?: string;
  variables: { cliente: string; vehiculo: string; placa: string; estado: string; orden: string };
}) => {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    throw new Error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
  }

  const endpoint = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: template_name || "cambio_estatus_taller",
      language: { code: language_code || "es" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: variables.cliente },   // {{1}}
            { type: "text", text: variables.vehiculo },  // {{2}}
            { type: "text", text: variables.placa },     // {{3}}
            { type: "text", text: variables.estado },    // {{4}}
            { type: "text", text: variables.orden }      // {{5}}
          ]
        }
      ]
    }
  };

  const sendResp = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await safeJson(sendResp);
  if (!sendResp.ok) {
    throw new Error(result?.error?.message || "WhatsApp API error");
  }

  return {
    provider: "meta-whatsapp-business",
    messageId: result?.messages?.[0]?.id || null,
    providerResponse: result
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const body = await req.json();
    const record = body.record || body;

    const rawTo = record.telefono || record.to;
    const cliente = record.cliente_nombre || record.cliente || "Cliente";
    const vehiculo = record.vehiculo_estilo || record.vehiculo || "Vehículo";
    const placa = record.placa || "Sin Placa";
    const estado = record.estatus || record.estado || "Actualizado";
    const orden = record.numero_orden || record.order_id || record.id || "S/N";

    if (!rawTo) {
      return jsonResponse(400, { ok: false, error: "Número de teléfono (to/telefono) requerido" });
    }

    const telefonoLimpio = String(rawTo).replace(/[- ]/g, "");
    const telefonoDestino = telefonoLimpio.startsWith("506") ? telefonoLimpio : `506${telefonoLimpio}`;

    const template_name = "cambio_estatus_taller";

    const variablesTaller = {
      cliente,
      vehiculo,
      placa,
      estado,
      orden: String(orden)
    };

    const sendResult = await sendViaMeta({
      to: telefonoDestino,
      mode: "template",
      template_name,
      language_code: "es",
      variables: variablesTaller
    });

    await persistLog({
      order_id: String(orden),
      estado: estado,
      placa: placa,
      cliente: cliente,
      telefono: telefonoDestino,
      mensaje: `Plantilla: ${template_name} enviada a ${cliente}`,
      status: "sent",
      provider: sendResult.provider,
      provider_message_id: sendResult.messageId,
      provider_response: sendResult.providerResponse
    });

    return jsonResponse(200, {
      ok: true,
      provider: sendResult.provider,
      whatsapp_message_id: sendResult.messageId,
      order_id: orden,
      estado,
      placa,
      cliente
    });

  } catch (error) {
    // CORRECCIÓN AQUÍ: Aseguramos el tipado correcto para TypeScript/Deno
    const errorMessage = error instanceof Error ? error.message : "Unexpected error";
    console.error("Error crítico en Edge Function:", errorMessage);
    
    await persistLog({
      telefono: "unknown",
      mensaje: "Fallo en ejecución",
      status: "failed",
      error: errorMessage
    });

    return jsonResponse(500, { ok: false, error: errorMessage });
  }
});