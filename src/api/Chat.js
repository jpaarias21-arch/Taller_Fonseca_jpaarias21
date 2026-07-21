// src/api/Chat.js
import { supabase } from "@/lib/supabaseClient";

export const ChatAPI = {
  /**
   * Obtener mensajes del chat (ordenados por fecha ascendente)
   * @param {number} [limit=50]
   * @returns {Promise<Array>}
   */
  obtenerMensajes: async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error en ChatAPI.obtenerMensajes:", error.message);
      throw error;
    }
  },

  /**
   * Enviar un mensaje al chat general
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.userName
   * @param {string} params.userRole
   * @param {string} params.message
   * @returns {Promise<object>}
   */
  enviarMensaje: async ({ userId, userName, userRole, message }) => {
    if (!message?.trim()) {
      throw new Error("El mensaje no puede estar vacío");
    }

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert([
          {
            user_id: userId,
            user_name: userName,
            user_role: userRole,
            message: message.trim(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error en ChatAPI.enviarMensaje:", error.message);
      throw error;
    }
  },

  /**
   * Suscribirse a nuevos mensajes en tiempo real
   * @param {function} callback - Función que recibe el nuevo mensaje
   * @returns {object} - La suscripción para poder cancelarla
   */
  suscribirse: (callback) => {
    const subscription = supabase
      .channel("chat_messages_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return subscription;
  },

  /**
   * Cancelar suscripción en tiempo real
   * @param {object} subscription
   */
  cancelarSuscripcion: (subscription) => {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  },
};