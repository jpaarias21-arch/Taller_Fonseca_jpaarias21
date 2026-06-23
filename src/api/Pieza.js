// src/api/Pieza.js
import { supabase } from "../lib/supabaseClient";

export const PiezaAPI = {
    /**
     * GET /entities/Pieza
     * Listar todo el catálogo maestro de piezas disponibles
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('pieza')
                .select('*')
                .order('nombre', { ascending: true }); // Ordenadas alfabéticamente para facilitar dropdowns
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en PiezaAPI.obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * GET /entities/Pieza/{Pieza_id}
     * Obtener una pieza específica del catálogo por su ID
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('pieza')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en PiezaAPI.obtenerPorId (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Pieza
     * Registrar una nueva pieza de manera individual en el catálogo
     */
    crear: async (nuevaPieza) => {
        try {
            const { data, error } = await supabase
                .from('pieza')
                .insert([nuevaPieza])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en PiezaAPI.crear:", error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Pieza/bulk
     * Carga masiva de piezas al catálogo
     * (Ideal para poblar la base de datos con la lista base de piezas al iniciar el sistema)
     */
    crearMasivo: async (listaPiezas) => {
        try {
            const { data, error } = await supabase
                .from('pieza')
                .insert(listaPiezas)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en PiezaAPI.crearMasivo:", error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Pieza/{Pieza_id}
     * Actualizar los detalles o el nombre de una pieza específica por su ID
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('pieza')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en PiezaAPI.actualizar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Pieza/bulk o PATCH /entities/Pieza/update-many
     * Actualización masiva de piezas bajo un mismo criterio o filtro
     * Ejemplo: actualizarMuchos('categoria', 'Carrocería Antigua', { categoria: 'Carrocería' })
     */
    actualizarMuchos: async (columnaFiltro, valorFiltro, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('pieza')
                .update(datosActualizados)
                .eq(columnaFiltro, valorFiltro)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en PiezaAPI.actualizarMuchos por ${columnaFiltro}:`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Pieza/{Pieza_id}
     * Eliminar físicamente una pieza del catálogo usando su ID
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('pieza')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en PiezaAPI.eliminar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Pieza
     * Borrado masivo de piezas según filtros (deleteMany)
     */
    eliminarMuchos: async (columna, valor) => {
        try {
            const { data, error } = await supabase
                .from('pieza')
                .delete()
                .eq(columna, valor)
                .select();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Error en PiezaAPI.eliminarMuchos por ${columna}:`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Pieza/{Pieza_id}/restore
     * Restaurar una pieza eliminada (si aplicas políticas de soft-delete en tu backend)
     */
    restaurar: async (id) => {
        try {
            const { data, error } = await supabase
                .from('pieza')
                .update({ deleted_at: null }) // Modificar si manejas una columna activa/inactiva
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en PiezaAPI.restaurar (${id}):`, error.message);
            throw error;
        }
    }
};