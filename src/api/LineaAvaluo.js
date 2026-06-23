// src/api/LineaAvaluo.js
import { supabase } from "../lib/supabaseClient";

export const LineaAvaluoAPI = {
    /**
     * GET /entities/LineaAvaluo
     * Listar todos los registros de líneas de avalúo
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('linea_avaluo')
                .select('*');
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en LineaAvaluoAPI.obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * GET /entities/LineaAvaluo/{LineaAvaluo_id}
     * Obtener una línea de avalúo específica por su ID
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('linea_avaluo')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en LineaAvaluoAPI.obtenerPorId (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * POST /entities/LineaAvaluo
     * Crear una sola línea de avalúo (para una pieza)
     */
    crear: async (nuevaLinea) => {
        try {
            const { data, error } = await supabase
                .from('linea_avaluo')
                .insert([nuevaLinea])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en LineaAvaluoAPI.crear:", error.message);
            throw error;
        }
    },

    /**
     * POST /entities/LineaAvaluo/bulk
     * Crear múltiples líneas de avalúo a la vez (Inserción masiva de piezas)
     */
    crearMasivo: async (listaLineas) => {
        try {
            const { data, error } = await supabase
                .from('linea_avaluo')
                .insert(listaLineas) // Recibe un array de objetos [{...}, {...}]
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en LineaAvaluoAPI.crearMasivo:", error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/LineaAvaluo/{LineaAvaluo_id}
     * Actualizar una línea de avalúo por ID
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('linea_avaluo')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en LineaAvaluoAPI.actualizar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/LineaAvaluo/bulk o PATCH /entities/LineaAvaluo/update-many
     * Actualizar masivamente líneas de avalúo que cumplan un criterio
     * Ejemplo: actualizarMuchos('orden_id', '123-ABC', { es_ampliacion: true })
     */
    actualizarMuchos: async (columnaFiltro, valorFiltro, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('linea_avaluo')
                .update(datosActualizados)
                .eq(columnaFiltro, valorFiltro)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en LineaAvaluoAPI.actualizarMuchos por ${columnaFiltro}:`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/LineaAvaluo/{LineaAvaluo_id}
     * Eliminar una línea de avalúo por su ID
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('linea_avaluo')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en LineaAvaluoAPI.eliminar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/LineaAvaluo
     * Eliminar múltiples registros basados en un filtro (deleteMany)
     * Ejemplo típico del taller: eliminarMuchos('orden_id', 'ID_DE_LA_ORDEN')
     */
    eliminarMuchos: async (columna, valor) => {
        try {
            const { data, error } = await supabase
                .from('linea_avaluo')
                .delete()
                .eq(columna, valor)
                .select();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Error en LineaAvaluoAPI.eliminarMuchos por ${columna}:`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/LineaAvaluo/{LineaAvaluo_id}/restore
     * Restaurar un registro borrado (si se usa soft-delete)
     */
    restaurar: async (id) => {
        try {
            const { data, error } = await supabase
                .from('linea_avaluo')
                .update({ deleted_at: null }) // O activar la bandera correspondiente si aplica
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en LineaAvaluoAPI.restaurar (${id}):`, error.message);
            throw error;
        }
    }
};