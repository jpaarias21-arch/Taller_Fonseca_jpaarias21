import { supabase } from "@/lib/supabaseClient";

export const WhatsAppAPI = {
  async enviarEstatus(payload) {
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
  }
};
