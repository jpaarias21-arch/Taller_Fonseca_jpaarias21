// src/api/Inventario.js
import { supabase } from "../lib/supabaseClient";

export const InventarioAPI = {
    /**
     * GET /entities/Inventario
     * Listar todos los registros
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('inventario')
                .select('*');
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * GET /entities/Inventario/{Inventario_id}
     * Obtener un registro por ID
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('inventario')
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
     * POST /entities/Inventario
     * Crear un solo registro
     */
    crear: async (nuevoArticulo) => {
        try {
            const { data, error } = await supabase
                .from('inventario')
                .insert([nuevoArticulo])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en crear:", error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Inventario/bulk
     * Crear múltiples registros a la vez
     */
    crearMasivo: async (listaArticulos) => {
        try {
            const { data, error } = await supabase
                .from('inventario')
                .insert(listaArticulos)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en crearMasivo:", error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Inventario/{Inventario_id}
     * Actualizar un registro por ID
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('inventario')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en actualizar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * PUT o PATCH para actualizaciones masivas filtradas
     * Equivalente a /entities/Inventario/bulk o /update-many
     */
    actualizarMuchos: async (columnaFiltro, valorFiltro, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('inventario')
                .update(datosActualizados)
                .eq(columnaFiltro, valorFiltro)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en actualizarMuchos por ${columnaFiltro}:`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Inventario/{Inventario_id}
     * Eliminar un registro por ID
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('inventario')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en eliminar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Inventario
     * Eliminar múltiples registros basados en un filtro (deleteMany)
     */
    eliminarMuchos: async (columna, valor) => {
        try {
            const { data, error } = await supabase
                .from('inventario')
                .delete()
                .eq(columna, valor)
                .select();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Error en eliminarMuchos por ${columna}:`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Inventario/{Inventario_id}/restore
     * Restaurar un registro eliminado (Utilizado si manejas Soft Delete / Borrado lógico)
     */
    restaurar: async (id) => {
        try {
            // Nota: En Supabase el borrado físico (delete) remueve la fila por completo.
            // Si en tu base de datos manejas una columna tipo 'deleted_at' o 'activo', 
            // este método cambia el estado para simular el comportamiento de "restore".
            const { data, error } = await supabase
                .from('inventario')
                .update({ deleted_at: null }) // O activo: true, dependiendo de tu esquema
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en restaurar (${id}):`, error.message);
            throw error;
        }
    }
};