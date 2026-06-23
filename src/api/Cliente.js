// src/api/Cliente.js
import { supabase } from "../lib/supabaseClient";

export const ClienteAPI = {
    /**
     * Listar Clientes (Equivalente a GET /entities/Cliente)
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * Obtener Cliente por ID (Equivalente a GET /entities/Cliente/{id})
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en obtenerPorId (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * Crear Cliente (Equivalente a POST /entities/Cliente)
     */
    crear: async (nuevoCliente) => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .insert([nuevoCliente])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en crear cliente:", error.message);
            throw error;
        }
    },

    /**
     * Actualizar Cliente (Equivalente a PUT /entities/Cliente/{id})
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en actualizar cliente (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * Eliminar Cliente por ID (Equivalente a DELETE /entities/Cliente/{id})
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en eliminar cliente (${id}):`, error.message);
            throw error;
        }
    }
};