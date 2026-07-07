import { supabase } from "@/lib/supabaseClient";

const mapWhatsAppError = (error) => {
  const raw = String(error?.message || "");
  const lower = raw.toLowerCase();

  if (lower.includes("failed to send a request to the edge function")) {
    return "No se pudo contactar la Edge Function de WhatsApp. Verifique conexión y despliegue de send-whatsapp-status en Supabase.";
  }

  if (lower.includes("function was not found") || lower.includes("not_found")) {
    return "La Edge Function send-whatsapp-status no está desplegada en este proyecto Supabase.";
  }

  return raw || "No fue posible completar el envío por WhatsApp.";
};

export const WhatsAppAPI = {
  async enviarEstatus(payload) {
    if (!payload?.to) {
      throw new Error("Falta el teléfono del cliente para enviar WhatsApp.");
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-status", {
        body: payload
      });

      if (error) {
        throw new Error(error.message || "No se pudo enviar el mensaje de WhatsApp.");
      }

      if (!data?.ok) {
        throw new Error(data?.error || "El backend rechazó el envío de WhatsApp.");
      }

      return data;
    } catch (error) {
      throw new Error(mapWhatsAppError(error));
    }
  }
};
