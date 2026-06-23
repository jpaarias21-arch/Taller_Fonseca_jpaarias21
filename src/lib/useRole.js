import { useAuth } from "@/lib/AuthContext";

/** @typedef {"admin" | "gerente" | "user" | "empleado"} RoleKey */

/** @type {Record<RoleKey, string>} */
export const ROLE_LABELS = {
  admin: "Dueño",
  gerente: "Gerente",
  user: "Secretaria",
  empleado: "Empleado",
};

/** @type {Record<RoleKey, string>} */
export const ROLE_COLORS = {
  admin: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  gerente: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  user: "bg-secondary text-muted-foreground border-border",
  empleado: "bg-green-500/20 text-green-400 border-green-500/40",
};

/** @type {Record<string, RoleKey>} */
const ROLE_ALIASES = {
  admin: "admin",
  administrador: "admin",
  dueno: "admin",
  owner: "admin",
  gerente: "gerente",
  manager: "gerente",
  empleado: "empleado",
  tecnico: "empleado",
  user: "user",
  usuario: "user",
  secretaria: "user",
};

/** @param {unknown} rawRole */
function normalizeRole(rawRole) {
  if (typeof rawRole !== "string") return "user";
  const normalized = rawRole
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return ROLE_ALIASES[normalized] || "user";
}

export function useRole() {
  const { user } = /** @type {{ user: { role?: string } | null }} */ (useAuth());
  const userRecord = user && typeof user === "object" ? /** @type {Record<string, unknown>} */ (user) : null;
  const rawRole = userRecord?.role;
  const role = /** @type {RoleKey} */ (normalizeRole(rawRole));
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