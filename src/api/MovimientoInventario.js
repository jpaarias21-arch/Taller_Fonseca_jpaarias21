// src/api/MovimientoInventario.js
import { supabase } from "../lib/supabaseClient";

export const MovimientoInventarioAPI = {
    /**
     * GET /entities/MovimientoInventario
     * Listar todo el historial de movimientos del kardex
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('movimiento_inventario')
                .select('*')
                .order('created_date', { ascending: false }); // Ordenado por el más reciente
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en MovimientoInventarioAPI.obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * GET /entities/MovimientoInventario/{MovimientoInventario_id}
     * Consultar un detalle de movimiento específico por su ID
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('movimiento_inventario')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en MovimientoInventarioAPI.obtenerPorId (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * POST /entities/MovimientoInventario
     * Registrar un único movimiento (ej. una salida manual o un ajuste)
     */
    crear: async (nuevoMovimiento) => {
        try {
            const { data, error } = await supabase
                .from('movimiento_inventario')
                .insert([nuevoMovimiento])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en MovimientoInventarioAPI.crear:", error.message);
            throw error;
        }
    },

    /**
     * POST /entities/MovimientoInventario/bulk
     * Registrar múltiples movimientos a la vez 
     * (Útil al despachar una lista completa de materiales para una orden de trabajo)
     */
    crearMasivo: async (listaMovimientos) => {
        try {
            const { data, error } = await supabase
                .from('movimiento_inventario')
                .insert(listaMovimientos)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en MovimientoInventarioAPI.crearMasivo:", error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/MovimientoInventario/{MovimientoInventario_id}
     * Modificar un registro de movimiento por ID
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('movimiento_inventario')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en MovimientoInventarioAPI.actualizar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/MovimientoInventario
     * Eliminar múltiples registros basados en un criterio específico
     * Según tu documentación, por ejemplo, filtrar por inventario_id
     */
    eliminarMuchos: async (columnaFiltro, valorFiltro) => {
        try {
            const { data, error } = await supabase
                .from('movimiento_inventario')
                .delete()
                .eq(columnaFiltro, valorFiltro)
                .select();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Error en MovimientoInventarioAPI.eliminarMuchos por ${columnaFiltro}:`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/MovimientoInventario/{MovimientoInventario_id}
     * Eliminar un movimiento individual del historial
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('movimiento_inventario')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en MovimientoInventarioAPI.eliminar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/MovimientoInventario/{MovimientoInventario_id}/restore
     * Restaurar un registro de movimiento borrado
     */
    restaurar: async (id) => {
        try {
            const { data, error } = await supabase
                .from('movimiento_inventario')
                .update({ deleted_at: null }) // Ajustar según tu política de borrado lógico
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en MovimientoInventarioAPI.restaurar (${id}):`, error.message);
            throw error;
        }
    }
};