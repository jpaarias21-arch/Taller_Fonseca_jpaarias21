// src/api/OrdenTrabajo.js
import { supabase } from "../lib/supabaseClient";

export const OrdenTrabajoAPI = {
    /**
     * GET /entities/OrdenTrabajo
     * Listar todas las órdenes de trabajo del taller
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('orden_trabajo')
                .select('*')
                .order('created_date', { ascending: false }); // Muestra las más recientes primero
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en OrdenTrabajoAPI.obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * GET /entities/OrdenTrabajo/{OrdenTrabajo_id}
     * Obtener el expediente completo de una orden por su ID
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('orden_trabajo')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en OrdenTrabajoAPI.obtenerPorId (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * POST /entities/OrdenTrabajo
     * Crear una nueva orden de trabajo (Apertura de orden)
     */
    crear: async (nuevaOrden) => {
        try {
            const { data, error } = await supabase
                .from('orden_trabajo')
                .insert([nuevaOrden])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en OrdenTrabajoAPI.crear:", error.message);
            throw error;
        }
    },

    /**
     * POST /entities/OrdenTrabajo/bulk
     * Crear múltiples órdenes a la vez (Inserción masiva)
     */
    crearMasivo: async (listaOrdenes) => {
        try {
            const { data, error } = await supabase
                .from('orden_trabajo')
                .insert(listaOrdenes)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en OrdenTrabajoAPI.crearMasivo:", error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/OrdenTrabajo/{OrdenTrabajo_id}
     * Actualizar los datos de una orden (Cambios de estado, costos finales, etc.)
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('orden_trabajo')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en OrdenTrabajoAPI.actualizar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/OrdenTrabajo/bulk o PATCH /entities/OrdenTrabajo/update-many
     * Actualizar de golpe varias órdenes bajo un filtro común
     * Ejemplo: actualizarMuchos('estado', 'Terminado', { estado: 'Entregado' })
     */
    actualizarMuchos: async (columnaFiltro, valorFiltro, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('orden_trabajo')
                .update(datosActualizados)
                .eq(columnaFiltro, valorFiltro)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en OrdenTrabajoAPI.actualizarMuchos por ${columnaFiltro}:`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/OrdenTrabajo/{OrdenTrabajo_id}
     * Eliminar físicamente una orden del sistema por ID
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('orden_trabajo')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en OrdenTrabajoAPI.eliminar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/OrdenTrabajo
     * Eliminar múltiples órdenes que coincidan con un criterio (deleteMany)
     */
    eliminarMuchos: async (columna, valor) => {
        try {
            const { data, error } = await supabase
                .from('orden_trabajo')
                .delete()
                .eq(columna, valor)
                .select();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Error en OrdenTrabajoAPI.eliminarMuchos por ${columna}:`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/OrdenTrabajo/{OrdenTrabajo_id}/restore
     * Restaurar una orden eliminada (en caso de usar esquemas de borrado lógico)
     */
    restaurar: async (id) => {
        try {
            const { data, error } = await supabase
                .from('orden_trabajo')
                .update({ deleted_at: null }) // Cambiar por la bandera lógica que use tu negocio si aplica
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en OrdenTrabajoAPI.restaurar (${id}):`, error.message);
            throw error;
        }
    }
};