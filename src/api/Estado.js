// src/api/Estado.js
import { supabase } from "../lib/supabaseClient";

export const EstadoAPI = {
    /**
     * GET /entities/Estado
     * Listar todos los estados del flujo de trabajo organizados por orden lógico
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('estado')
                .select('*')
                .order('orden_flujo', { ascending: true }); // Crucial para mantener la secuencia del taller
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en EstadoAPI.obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * GET /entities/Estado/{Estado_id}
     * Obtener un estado específico por su ID
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('estado')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en EstadoAPI.obtenerPorId (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Estado
     * Crear una nueva etapa o estado en el catálogo individualmente
     */
    crear: async (nuevoEstado) => {
        try {
            const { data, error } = await supabase
                .from('estado')
                .insert([nuevoEstado])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en EstadoAPI.crear:", error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Estado/bulk
     * Creación o carga masiva de estados iniciales del sistema
     */
    crearMasivo: async (listaEstados) => {
        try {
            const { data, error } = await supabase
                .from('estado')
                .insert(listaEstados)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en EstadoAPI.crearMasivo:", error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Estado/{Estado_id}
     * Actualizar las propiedades de un estado (ej: cambiar el color_hex o la descripción) por su ID
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('estado')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en EstadoAPI.actualizar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Estado/bulk o PATCH /entities/Estado/update-many
     * Actualizar masivamente múltiples estados bajo un criterio común
     */
    actualizarMuchos: async (columnaFiltro, valorFiltro, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('estado')
                .update(datosActualizados)
                .eq(columnaFiltro, valorFiltro)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en EstadoAPI.actualizarMuchos por ${columnaFiltro}:`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Estado/{Estado_id}
     * Eliminar físicamente un estado del catálogo usando su ID
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('estado')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en EstadoAPI.eliminar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Estado
     * Borrado masivo de estados según un filtro específico (deleteMany)
     */
    eliminarMuchos: async (columna, valor) => {
        try {
            const { data, error } = await supabase
                .from('estado')
                .delete()
                .eq(columna, valor)
                .select();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Error en EstadoAPI.eliminarMuchos por ${columna}:`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Estado/{Estado_id}/restore
     * Restaurar un estado eliminado (en caso de usar esquemas de borrado lógico)
     */
    restaurar: async (id) => {
        try {
            const { data, error } = await supabase
                .from('estado')
                .update({ deleted_at: null }) // Modificar si manejas una columna activa/inactiva
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en EstadoAPI.restaurar (${id}):`, error.message);
            throw error;
        }
    }
};