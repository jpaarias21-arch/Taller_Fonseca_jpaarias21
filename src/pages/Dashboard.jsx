// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Car, ShoppingCart, CheckCircle, Clock, ArrowRight, AlertTriangle,
  Wrench, Package, Zap
} from "lucide-react";

const KANBAN_STATIONS = [
  "Recepción", "Espera de Autorización", "Desarmado", "Enderezado",
  "Preparación", "Cabina de Pintura", "Armado", "Pulido",
  "Control de Calidad", "Entregado"
];

// Barra superior de color por estación (flujo de producción)
const STATION_BAR = {
  "Recepción":              { bar: "border-t-blue-400",    text: "text-blue-400" },
  "Espera de Autorización": { bar: "border-t-yellow-400",  text: "text-yellow-400" },
  "Desarmado":              { bar: "border-t-orange-400",  text: "text-orange-400" },
  "Enderezado":             { bar: "border-t-red-400",     text: "text-red-400" },
  "Preparación":            { bar: "border-t-purple-400",  text: "text-purple-400" },
  "Cabina de Pintura":      { bar: "border-t-pink-400",    text: "text-pink-400" },
  "Armado":                 { bar: "border-t-primary",     text: "text-primary" },
  "Pulido":                 { bar: "border-t-teal-400",    text: "text-teal-400" },
  "Control de Calidad":     { bar: "border-t-green-400",   text: "text-green-400" },
  "Entregado":              { bar: "border-t-emerald-400", text: "text-emerald-400" },
};

const STATION_BADGE = {
  "Recepción":              "bg-blue-500/15 text-blue-400",
  "Espera de Autorización": "bg-yellow-500/15 text-yellow-400",
  "Desarmado":              "bg-orange-500/15 text-orange-400",
  "Enderezado":             "bg-red-500/15 text-red-400",
  "Preparación":            "bg-purple-500/15 text-purple-400",
  "Cabina de Pintura":      "bg-pink-500/15 text-pink-400",
  "Armado":                 "bg-primary/15 text-primary",
  "Pulido":                 "bg-teal-500/15 text-teal-400",
  "Control de Calidad":     "bg-green-500/15 text-green-400",
  "Entregado":              "bg-emerald-500/15 text-emerald-400",
};

// Estaciones visibles en el flujo de producción (sin Entregado y Espera)
const FLUJO_STATIONS = [
  "Recepción", "Desarmado", "Enderezado", "Preparación",
  "Cabina de Pintura", "Armado", "Pulido", "Control de Calidad"
];

const glassStyle = {
  background: "rgba(26,28,30,0.7)",
  backdropFilter: "blur(12px)",
  border: "0.5px solid rgba(255,255,255,0.1)",
};

export default function Dashboard() {
  const [ordenes, setOrdenes] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const withTimeout = (promise, label, timeoutMs = 12000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout cargando ${label}`)), timeoutMs);
        }),
      ]);
    };

    const load = async () => {
      try {
        const [ordsRes, compsRes] = await Promise.allSettled([
          withTimeout(base44.entities.OrdenTrabajo.list("-created_date", 100), "órdenes"),
          withTimeout(
            base44.entities.RequerimientoCompra
              .list("-created_date", 200)
              .then((all) => all.filter((r) => r.estado === "Pendiente")),
            "compras"
          ),
        ]);

        if (cancelled) return;

        if (ordsRes.status === "fulfilled") {
          setOrdenes(Array.isArray(ordsRes.value) ? ordsRes.value : []);
        } else {
          console.error("Error cargando órdenes en dashboard:", ordsRes.reason);
          setOrdenes([]);
        }

        if (compsRes.status === "fulfilled") {
          setCompras(Array.isArray(compsRes.value) ? compsRes.value : []);
        } else {
          console.error("Error cargando compras en dashboard:", compsRes.reason);
          setCompras([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const hoy = useMemo(() => new Date().toISOString().split("T")[0], []);

  const activas = useMemo(
    () => ordenes.filter((o) => o.estado_kanban !== "Entregado"),
    [ordenes]
  );

  const pendientesAprobacion = useMemo(
    () => ordenes.filter((o) => o.estado_cotizacion === "Borrador" || o.estado_cotizacion === "Enviado"),
    [ordenes]
  );

  const entregadasHoy = useMemo(
    () => ordenes.filter((o) => o.fecha_entrega_real === hoy),
    [ordenes, hoy]
  );

  const stationCounts = useMemo(() => {
    const counts = {};
    KANBAN_STATIONS.forEach((s) => {
      counts[s] = 0;
    });

    for (const orden of ordenes) {
      const station = orden.estado_kanban;
      if (!station || station === "Entregado" || !(station in counts)) continue;
      counts[station] += 1;
    }

    return counts;
  }, [ordenes]);

  const activasPreview = useMemo(() => activas.slice(0, 7), [activas]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Hero Banner */}
      <div
        className="relative w-full rounded-xl overflow-hidden p-6 md:p-8 border border-primary/20"
        style={glassStyle}
      >
        {/* subtle dot grid overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10">
          <h1 className="font-heading font-black text-4xl md:text-5xl uppercase italic tracking-tight text-primary leading-none">
            Estado de Operaciones
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-xl">
            Control centralizado · {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Vehículos en Taller",
            value: activas.length,
            icon: <Car size={22} className="text-primary" />,
            bar: "bg-primary",
            sub: "activos ahora",
            subColor: "text-primary"
          },
          {
            label: "Pend. Aprobación",
            value: pendientesAprobacion.length,
            icon: <Clock size={22} className="text-yellow-400" />,
            bar: "bg-yellow-400",
            sub: "sin cotización aprobada",
            subColor: "text-yellow-400"
          },
          {
            label: "Req. de Compra",
            value: compras.length,
            icon: <ShoppingCart size={22} className="text-orange-400" />,
            bar: "bg-orange-400",
            sub: "pendientes de compra",
            subColor: "text-orange-400"
          },
          {
            label: "Entregados Hoy",
            value: entregadasHoy.length,
            icon: <CheckCircle size={22} className="text-green-400" />,
            bar: "bg-green-400",
            sub: "vehículos entregados",
            subColor: "text-green-400"
          },
        ].map(kpi => (
          <div key={kpi.label} className="relative rounded-xl p-4 overflow-hidden hover:brightness-110 transition-all" style={glassStyle}>
            <div className={`absolute top-0 left-0 w-1 h-full ${kpi.bar}`} />
            <div className="flex justify-between items-start pl-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{kpi.label}</p>
              {kpi.icon}
            </div>
            <p className="font-heading font-black text-4xl mt-2 pl-1">{kpi.value}</p>
            <p className={`text-[11px] font-semibold mt-1 pl-1 ${kpi.subColor}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Flujo de Producción */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Flujo de Producción</h2>
          <Link to="/kanban" className="ml-auto text-primary text-xs flex items-center gap-1 hover:underline">
            Ver Kanban <ArrowRight size={12} />
          </Link>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {FLUJO_STATIONS.map(station => {
            const { bar, text } = STATION_BAR[station] || { bar: "border-t-border", text: "text-muted-foreground" };
            return (
              <div
                key={station}
                className={`min-w-[150px] flex-1 rounded-xl p-4 border-t-4 ${bar}`}
                style={glassStyle}
              >
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${text}`}>{station}</p>
                <p className="font-heading font-black text-3xl">{String(stationCounts[station] || 0).padStart(2, "0")}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Órdenes Activas + Alertas de Compra */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Órdenes Activas */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Órdenes Activas</h2>
            </div>
            <Link to="/ordenes" className="text-primary text-xs flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="rounded-xl overflow-hidden" style={glassStyle}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Vehículo</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-semibold text-xs uppercase hidden sm:table-cell">Orden</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-semibold text-xs uppercase">Estación</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-semibold text-xs uppercase hidden md:table-cell">Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activasPreview.map(orden => (
                  <Link key={orden.id} to={`/ordenes/${orden.id}`} className="contents">
                    <tr className="hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            <Car size={15} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight">{orden.marca} {orden.modelo}</p>
                            <p className="text-xs text-muted-foreground">{orden.placa}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground hidden sm:table-cell font-mono">{orden.numero_orden}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATION_BADGE[orden.estado_kanban] || "bg-secondary text-muted-foreground"}`}>
                          {orden.estado_kanban}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell">{orden.fecha_entrega_estimada || "—"}</td>
                    </tr>
                  </Link>
                ))}
                {activas.length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-muted-foreground text-sm">No hay vehículos activos en el taller</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas de Suministros */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 mb-0.5">
            <div className="w-1 h-6 bg-red-400 rounded-full" />
            <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Alertas de Compra</h2>
          </div>

          {compras.length === 0 ? (
            <div className="rounded-xl p-5 text-center text-muted-foreground text-sm" style={glassStyle}>
              <CheckCircle size={28} className="mx-auto mb-2 text-green-400 opacity-60" />
              Sin requerimientos pendientes
            </div>
          ) : (
            <>
              {compras.slice(0, 4).map(req => (
                <div key={req.id} className="rounded-xl p-4 border-l-4 border-l-orange-400" style={glassStyle}>
                  <div className="flex items-start gap-3">
                    <Package size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm uppercase leading-tight">{req.pieza_nombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.numero_orden} · {req.tipo_repuesto}</p>
                    </div>
                  </div>
                </div>
              ))}
              {compras.length > 4 && (
                <Link to="/compras" className="rounded-xl p-3 text-center text-primary text-xs font-semibold hover:underline" style={glassStyle}>
                  +{compras.length - 4} más — Ver todas en Compras
                </Link>
              )}
              {/* Cotizaciones pendientes */}
              {pendientesAprobacion.length > 0 && (
                <div className="rounded-xl p-4" style={{ ...glassStyle, borderLeft: "4px solid hsl(var(--primary))" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={15} className="text-primary flex-shrink-0" />
                      <span className="font-semibold text-sm">Validación Presupuestos</span>
                    </div>
                    <span className="text-primary font-bold text-sm">{pendientesAprobacion.length} pend.</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}