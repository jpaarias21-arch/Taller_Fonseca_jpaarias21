import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Kanban, ShoppingCart,
  Package, Users, ChevronLeft, ChevronRight, Menu,
  Wrench, LogOut, BarChart, MessageCircle
} from "lucide-react";
import Footer from "./Footer";
import ColonIcon from "./ColonIcon";
import { useAuth } from "@/lib/AuthContext";
import { useRole } from "@/lib/useRole";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/ordenes", icon: ClipboardList, label: "Órdenes / Avalúos" },
  { path: "/kanban", icon: Kanban, label: "Estatus del Taller" },
  { path: "/compras", icon: ShoppingCart, label: "Compras" },
  { path: "/inventario", icon: Package, label: "Inventario" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/catalogo", icon: Wrench, label: "Catálogo Piezas" },
  { path: "/precios", icon: ColonIcon, label: "Lista de Precios" },
  { path: "/reportes", icon: BarChart, label: "Reportes" },
  { path: "/chat", icon: MessageCircle, label: "Chat General" },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  const { roleLabel, roleColor } = useRole();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo area */}
        <div className={`flex items-center border-b border-sidebar-border p-3 ${collapsed ? "justify-center" : ""}`}>
          {collapsed ? (
            <div className="w-9 h-9 rounded-md flex items-center justify-center border-2 flex-shrink-0" style={{ backgroundColor: 'hsl(221,83%,28%)', borderColor: 'hsl(45,100%,54%)' }}>
              <span className="text-white font-display font-bold text-xs">CPF</span>
            </div>
          ) : (
            <img
              src="https://media.base44.com/images/public/6a30d61e19eaae77bf0846b5/a7ada31c9_image.png"
              alt="Taller Mecánico Fonseca"
              className="w-full max-w-[180px] mx-auto object-contain"
            />
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`nav-item ${isActive(path) ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {!collapsed && (
            <div className="px-2 py-1.5 rounded-lg bg-secondary/50">
              <p className="text-xs font-semibold text-foreground truncate">{user?.full_name || user?.email || "Usuario"}</p>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${roleColor}`}>{roleLabel}</span>
            </div>
          )}
          <button
            onClick={() => logout()}
            className={`nav-item w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${collapsed ? "justify-center px-2" : ""}`}
            title="Cerrar sesión"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:flex p-3 border-t border-sidebar-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`nav-item w-full ${collapsed ? "justify-center px-2" : ""}`}
          >
            {collapsed ? <ChevronRight size={18} /> : (
              <>
                <ChevronLeft size={18} />
                <span>Colapsar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-64"}`}>
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground"
          >
            <Menu size={20} />
          </button>
          <img
            src="https://media.base44.com/images/public/6a30d61e19eaae77bf0846b5/a7ada31c9_image.png"
            alt="Taller Mecánico Fonseca"
            className="h-8 object-contain"
          />
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}