// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Plus, Search, Car, Filter, ArrowRight, Trash2,
  Printer, CheckSquare, XSquare, Check, Loader2, DollarSign
} from "lucide-react";
import { useRole } from "@/lib/useRole";
import { formatDisplayDateTime } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// Función para formatear el monto de la cotización
const formatCurrency = (amount, currency = "CRC") => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₡0";
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Color de barra lateral por estado cotización
const BARRA_COLOR = {
  "Borrador":               "bg-muted-foreground",
  "Enviado":                "bg-blue-400",
  "Aprobado":               "bg-green-400",
  "Autorizado por Seguro":  "bg-emerald-400",
  "Ampliación":             "bg-purple-400",
};

// Badge de estado cotización
const BADGE_STYLE = {
  "Borrador":               "bg-secondary/80 text-muted-foreground border-border",
  "Enviado":                "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Aprobado":               "bg-green-500/15 text-green-400 border-green-500/30",
  "Autorizado por Seguro":  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Ampliación":             "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const KANBAN_COLOR = {
  "Recepción":              "text-blue-400",
  "Espera de Autorización": "text-yellow-400",
  "Desarmado":              "text-orange-400",
  "Enderezado":             "text-red-400",
  "Preparación":            "text-purple-400",
  "Cabina de Pintura":      "text-pink-400",
  "Armado":                 "text-indigo-400",
  "Pulido":                 "text-teal-400",
  "Control de Calidad":     "text-green-400",
  "Entregado":              "text-emerald-400",
};

const ESTADOS_COTIZACION = [
  "Borrador", "Enviado", "Aprobado", "Autorizado por Seguro", "Ampliación"
];

export default function Ordenes() {
  const { canCreateOrder, canEditOrders } = useRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkTargetEstado, setBulkTargetEstado] = useState("");

  useEffect(() => {
    base44.entities.OrdenTrabajo.list("-created_date", 200).then(data => {
      setOrdenes(data);
      setLoading(false);
    });
  }, []);

  const searchLower = search.toLowerCase();

  const filtered = useMemo(() => {
    return ordenes.filter((o) => {
      const matchSearch =
        o.placa?.toLowerCase().includes(searchLower) ||
        o.cliente_nombre?.toLowerCase().includes(searchLower) ||
        o.marca?.toLowerCase().includes(searchLower) ||
        o.numero_orden?.toLowerCase().includes(searchLower);
      const matchEstado = filterEstado === "todos" || o.estado_cotizacion === filterEstado;
      return matchSearch && matchEstado;
    });
  }, [ordenes, searchLower, filterEstado]);

  const handleDeleteOrder = async (orden) => {
    const confirmed = window.confirm(`¿Eliminar la orden ${orden.numero_orden || orden.placa || "seleccionada"}?`);
    if (!confirmed) return;

    setDeletingId(orden.id);
    try {
      const [lineas, compras] = await Promise.all([
        base44.entities.LineaAvaluo.filter({ orden_id: orden.id }),
        base44.entities.RequerimientoCompra.filter({ orden_id: orden.id })
      ]);

      await Promise.all([
        ...lineas.map((linea) => base44.entities.LineaAvaluo.delete(linea.id)),
        ...compras.map((compra) => base44.entities.RequerimientoCompra.delete(compra.id))
      ]);

      await base44.entities.OrdenTrabajo.delete(orden.id);
      setOrdenes((prev) => prev.filter((item) => item.id !== orden.id));

      toast({
        title: "Orden eliminada",
        description: "La orden fue eliminada correctamente."
      });
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error?.message || "Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatusChange = async () => {
    if (!bulkTargetEstado || selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `¿Cambiar estado de cotización a "${bulkTargetEstado}" para ${selectedIds.size} orden(es) seleccionada(s)?`
    );
    if (!confirmed) return;

    setBulkUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    const ids = [...selectedIds];
    for (const id of ids) {
      try {
        await base44.entities.OrdenTrabajo.update(id, { estado_cotizacion: bulkTargetEstado });
        successCount++;
      } catch (err) {
        console.error(`Error actualizando orden ${id}:`, err);
        errorCount++;
      }
    }

    // Refresh local state
    const updated = await base44.entities.OrdenTrabajo.list("-created_date", 200);
    setOrdenes(updated);

    setSelectedIds(new Set());
    setBulkTargetEstado("");

    toast({
      title: `${successCount} orden(es) actualizada(s)`,
      description: errorCount > 0
        ? `${errorCount} orden(es) no pudieron actualizarse.`
        : "Estado de cotización actualizado correctamente.",
      variant: errorCount > 0 ? "default" : "default",
    });

    setBulkUpdating(false);
  };

  const handlePrintCotizacion = (orden) => {
    navigate(`/ordenes/${orden.id}?tab=avaluo`);
    // Short delay to let the page load, then trigger export
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("exportar-proforma"));
    }, 800);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground text-sm">Gestión de vehículos y avalúos</p>
        </div>
        {canCreateOrder && (
          <Link to="/ordenes/nueva">
            <Button className="bg-primary text-primary-foreground font-semibold gap-2">
              <Plus size={16} /> Nueva Orden
            </Button>
          </Link>
        )}
      </div>

      {/* Bulk Action Bar — aparece cuando hay selección */}
      {selectedIds.size > 0 && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border border-primary/30"
          style={{ background: "rgba(26,28,30,0.85)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-primary flex-shrink-0">
            <CheckSquare size={16} />
            <span>{selectedIds.size} seleccionada(s)</span>
          </div>
          <div className="flex-1 flex flex-wrap items-center gap-2">
            <Select value={bulkTargetEstado} onValueChange={setBulkTargetEstado}>
              <SelectTrigger className="w-full sm:w-56 bg-card border-border text-sm">
                <SelectValue placeholder="Estado cotización…" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {ESTADOS_COTIZACION.map((est) => (
                  <SelectItem key={est} value={est}>{est}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleBulkStatusChange}
              disabled={!bulkTargetEstado || bulkUpdating}
              className="gap-2"
            >
              {bulkUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {bulkUpdating ? "Actualizando…" : "Aplicar"}
            </Button>
          </div>
          <button
            onClick={clearSelection}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <XSquare size={14} /> Limpiar
          </button>
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-white/10"
        style={{ background: "rgba(26,28,30,0.7)", backdropFilter: "blur(12px)" }}
      >
        {canEditOrders && filtered.length > 0 && (
          <div className="flex items-center gap-2 pr-2 border-r border-white/10">
            <Checkbox
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onCheckedChange={toggleSelectAll}
              aria-label="Seleccionar todas"
            />
            <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
              {selectedIds.size > 0
                ? `${selectedIds.size}/${filtered.length}`
                : "Todas"}
            </span>
          </div>
        )}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, cliente, marca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-full sm:w-52 bg-card border-border">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Estado cotización" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="Borrador">Borrador</SelectItem>
            <SelectItem value="Enviado">Enviado</SelectItem>
            <SelectItem value="Aprobado">Aprobado</SelectItem>
            <SelectItem value="Autorizado por Seguro">Autorizado por Seguro</SelectItem>
            <SelectItem value="Ampliación">Ampliación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(orden => {
              const barraColor = BARRA_COLOR[orden.estado_cotizacion] || "bg-muted-foreground";
              const badgeStyle = BADGE_STYLE[orden.estado_cotizacion] || "bg-secondary text-muted-foreground border-border";
              const kanbanColor = KANBAN_COLOR[orden.estado_kanban] || "text-muted-foreground";
              
              // Obtención del monto total de la cotización/avalúo
              const montoCotizacion = orden.monto_cotizado ?? orden.total_cotizacion ?? orden.monto_total ?? orden.monto ?? 0;
              const moneda = orden.moneda || "CRC";

              return (
                <div
                  key={orden.id}
                  className={`relative overflow-hidden rounded-xl border transition-all duration-300 group ${
                    selectedIds.has(orden.id)
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-white/10 hover:border-primary/30"
                  }`}
                  style={{ background: "rgba(26,28,30,0.7)", backdropFilter: "blur(12px)" }}
                >
                  {/* Barra lateral de color */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${barraColor}`} />

                  {/* Checkbox de selección — top-left corner */}
                  {canEditOrders && (
                    <div className="absolute top-3 left-3 z-10">
                      <Checkbox
                        checked={selectedIds.has(orden.id)}
                        onCheckedChange={() => toggleSelect(orden.id)}
                        aria-label={`Seleccionar orden ${orden.numero_orden}`}
                      />
                    </div>
                  )}

                  <div className="p-5 pl-6">
                    {/* Top row */}
                    <div className="flex justify-between items-start mb-4">
                      <div className={canEditOrders ? "ml-5" : ""}>
                        <span className="text-muted-foreground text-xs font-medium block mb-0.5">
                          {orden.numero_orden}
                        </span>
                        <h3 className="font-heading font-bold text-xl uppercase leading-tight">
                          {orden.marca} {orden.modelo} <span className="text-muted-foreground font-normal">{orden.anio}</span>
                        </h3>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border whitespace-nowrap ${badgeStyle}`}>
                        {orden.estado_cotizacion || "Borrador"}
                      </span>
                    </div>

                    {/* Cliente */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Car size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{orden.cliente_nombre}</p>
                        <p className="text-xs text-muted-foreground">{orden.cliente_telefono}</p>
                      </div>
                    </div>

                    {/* Datos clave + Cotización */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 mb-4">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Placa</p>
                        <p className="font-bold text-primary text-sm">{orden.placa}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Ingreso</p>
                        <p className="text-xs sm:text-sm font-medium">{formatDisplayDateTime(orden.fecha_ingreso)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Cotización</p>
                        <p className="font-bold text-emerald-400 text-sm">
                          {formatCurrency(montoCotizacion, moneda)}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-semibold ${kanbanColor}`}>
                        {orden.estado_kanban || "Recepción"}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Botón Imprimir Cotización */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePrintCotizacion(orden);
                          }}
                          className="flex items-center gap-1 text-blue-400 text-xs font-semibold hover:underline"
                        >
                          <Printer size={13} /> Cotización
                        </button>
                        {canEditOrders && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(orden)}
                            disabled={deletingId === orden.id}
                            className="flex items-center gap-1 text-destructive text-xs font-semibold hover:underline disabled:opacity-60"
                          >
                            <Trash2 size={13} /> {deletingId === orden.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        )}
                        <Link to={`/ordenes/${orden.id}`}>
                          <button className="flex items-center gap-1 text-primary text-xs font-semibold hover:underline group-hover:gap-2 transition-all">
                            Ver Detalles <ArrowRight size={13} />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Card "Nueva Orden" — solo dueño y gerente */}
            {canCreateOrder && (
              <Link to="/ordenes/nueva">
                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-secondary/20 transition-colors group min-h-[200px]">
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={28} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-heading font-bold uppercase tracking-wide">Crear Nueva Orden</p>
                    <p className="text-muted-foreground text-xs mt-1">Inicia un nuevo proceso de servicio o avalúo</p>
                  </div>
                </div>
              </Link>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-right">{filtered.length} resultado(s) encontrado(s)</p>
        </>
      )}
    </div>
  );
}