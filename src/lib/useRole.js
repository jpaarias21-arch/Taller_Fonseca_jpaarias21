import { useAuth } from "@/lib/AuthContext";

export const ROLE_LABELS = {
  admin: "Dueño",
  gerente: "Gerente",
  user: "Secretaria",
  empleado: "Empleado",
};

export const ROLE_COLORS = {
  admin: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  gerente: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  user: "bg-secondary text-muted-foreground border-border",
  empleado: "bg-green-500/20 text-green-400 border-green-500/40",
};

export function useRole() {
  const { user } = useAuth();
  const role = user?.role || "user";
  const isAdmin = role === "admin";
  const isGerente = role === "gerente";
  const isEmpleado = role === "empleado";

  return {
    role,
    roleLabel: ROLE_LABELS[role] || "Usuario",
    roleColor: ROLE_COLORS[role] || ROLE_COLORS.user,
    isAdmin,
    isGerente,
    isEmpleado,
    isSecretaria: !isAdmin && !isGerente && !isEmpleado,
    // Permisos específicos
    canEditPrices: isAdmin,           // Solo dueño modifica precios
    canApproveQuote: isAdmin,         // Solo dueño aprueba cotizaciones
    canManageInventory: isAdmin || isGerente,  // Dueño y gerente
    canManageCatalog: isAdmin || isGerente,    // Dueño y gerente
    canCreateOrder: true,                       // Todos pueden crear órdenes
    canMoveKanban: isAdmin || isGerente,       // Dueño y gerente
    canViewOrders: true,                        // Todos pueden ver órdenes y estado
    canEditOrders: !isEmpleado,                // Empleado no puede modificar nada existente
  };
}