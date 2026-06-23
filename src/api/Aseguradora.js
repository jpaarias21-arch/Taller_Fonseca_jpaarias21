// src/api/Aseguradora.js
import { supabase } from "../lib/supabaseClient";

export const AseguradoraAPI = {
    /**
     * GET /entities/Aseguradora
     * Listar todas las aseguradoras en convenio
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('aseguradora')
                .select('*')
                .order('nombre', { ascending: true }); // Ordenadas alfabéticamente
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en AseguradoraAPI.obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * GET /entities/Aseguradora/{Aseguradora_id}
     * Obtener los detalles de una aseguradora específica por su ID
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('aseguradora')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en AseguradoraAPI.obtenerPorId (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Aseguradora
     * Registrar una nueva aseguradora de forma individual
     */
    crear: async (nuevaAseguradora) => {
        try {
            const { data, error } = await supabase
                .from('aseguradora')
                .insert([nuevaAseguradora])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en AseguradoraAPI.crear:", error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Aseguradora/bulk
     * Creación masiva de aseguradoras en el sistema
     */
    crearMasivo: async (listaAseguradoras) => {
        try {
            const { data, error } = await supabase
                .from('aseguradora')
                .insert(listaAseguradoras)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en AseguradoraAPI.crearMasivo:", error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Aseguradora/{Aseguradora_id}
     * Actualizar los datos de contacto o información de una aseguradora por su ID
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('aseguradora')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en AseguradoraAPI.actualizar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Aseguradora/bulk o PATCH /entities/Aseguradora/update-many
     * Actualizar masivamente múltiples aseguradoras bajo un criterio común
     */
    actualizarMuchos: async (columnaFiltro, valorFiltro, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('aseguradora')
                .update(datosActualizados)
                .eq(columnaFiltro, valorFiltro)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en AseguradoraAPI.actualizarMuchos por ${columnaFiltro}:`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Aseguradora/{Aseguradora_id}
     * Eliminar físicamente una aseguradora por su ID
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('aseguradora')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en AseguradoraAPI.eliminar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Aseguradora
     * Eliminar múltiples aseguradoras que coincidan con un filtro (deleteMany)
     */
    eliminarMuchos: async (columna, valor) => {
        try {
            const { data, error } = await supabase
                .from('aseguradora')
                .delete()
                .eq(columna, valor)
                .select();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Error en AseguradoraAPI.eliminarMuchos por ${columna}:`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Aseguradora/{Aseguradora_id}/restore
     * Restaurar una aseguradora eliminada (en caso de usar borrado lógico)
     */
    restaurar: async (id) => {
        try {
            const { data, error } = await supabase
                .from('aseguradora')
                .update({ deleted_at: null }) // Modificar si manejas una columna de estado lógico
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en AseguradoraAPI.restaurar (${id}):`, error.message);
            throw error;
        }
    }
};