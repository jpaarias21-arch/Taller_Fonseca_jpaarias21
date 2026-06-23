// src/api/Usuario.js
import { supabase } from "../lib/supabaseClient";

export const UsuarioAPI = {
    /**
     * GET /entities/Usuario
     * Listar todos los usuarios y colaboradores registrados
     */
    obtenerTodos: async () => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .order('nombre', { ascending: true }); // Ordenados por nombre alfabéticamente
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en UsuarioAPI.obtenerTodos:", error.message);
            throw error;
        }
    },

    /**
     * GET /entities/Usuario/{Usuario_id}
     * Obtener el perfil de un usuario específico por su ID
     */
    obtenerPorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en UsuarioAPI.obtenerPorId (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Usuario
     * Crear o registrar un único usuario nuevo
     */
    crear: async (nuevoUsuario) => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .insert([nuevoUsuario])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en UsuarioAPI.crear:", error.message);
            throw error;
        }
    },

    /**
     * POST /entities/Usuario/bulk
     * Creación masiva de usuarios
     * (Útil si quieres cargar el personal del taller completo la primera vez)
     */
    crearMasivo: async (listaUsuarios) => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .insert(listaUsuarios)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error en UsuarioAPI.crearMasivo:", error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Usuario/{Usuario_id}
     * Actualizar los datos de perfil de un usuario (cambio de nombre, rol, etc.)
     */
    actualizar: async (id, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .update(datosActualizados)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en UsuarioAPI.actualizar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Usuario/bulk o PATCH /entities/Usuario/update-many
     * Actualizar masivamente varios usuarios bajo un criterio común
     * Ejemplo: actualizarMuchos('rol', 'Operario', { rol: 'Técnico' })
     */
    actualizarMuchos: async (columnaFiltro, valorFiltro, datosActualizados) => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .update(datosActualizados)
                .eq(columnaFiltro, valorFiltro)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en UsuarioAPI.actualizarMuchos por ${columnaFiltro}:`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Usuario/{Usuario_id}
     * Eliminar un usuario del sistema por su ID
     */
    eliminar: async (id) => {
        try {
            const { error } = await supabase
                .from('usuario')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error en UsuarioAPI.eliminar (${id}):`, error.message);
            throw error;
        }
    },

    /**
     * DELETE /entities/Usuario
     * Eliminar múltiples usuarios basados en un filtro común (deleteMany)
     */
    eliminarMuchos: async (columna, valor) => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .delete()
                .eq(columna, valor)
                .select();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error(`Error en UsuarioAPI.eliminarMuchos por ${columna}:`, error.message);
            throw error;
        }
    },

    /**
     * PUT /entities/Usuario/{Usuario_id}/restore
     * Restaurar un usuario eliminado (si aplicas políticas de soft-delete en tu backend)
     */
    restaurar: async (id) => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .update({ deleted_at: null }) // Modificar según la bandera que utilices para bajas lógicas
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error en UsuarioAPI.restaurar (${id}):`, error.message);
            throw error;
        }
    }
};