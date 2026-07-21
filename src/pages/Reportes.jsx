// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart, FileText, Download, CalendarDays, Loader2,
  Car, DollarSign, Package, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, ClipboardList, Building2
} from "lucide-react";
import { formatColones, formatDisplayDateTime } from "@/lib/utils";
import { generarReporteMensual, formatearReporteTexto, formatearReporteCSV } from "@/lib/reportes";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

const getMonthRange = (year, month) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  return { start, end: endDate.toISOString().slice(0, 10) };
};

export default function Reportes() {
  const { toast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReporte(null);
    try {
      const result = await generarReporteMensual(year, month);
      setReporte(result);
      toast({
        title: "Reporte generado",
        description: `${result.periodo.label} — ${result.ordenes.total} órdenes procesadas.`,
      });
    } catch (err) {
      const msg = err?.message || "Error al generar el reporte";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [year, month, toast]);

  const handleExportarTxt = useCallback(() => {
    if (!reporte) return;
    const content = formatearReporteTexto(reporte);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${reporte.periodo.label.replace(/\s/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado", description: "Reporte descargado como TXT" });
  }, [reporte, toast]);

  const handleExportarCSV = useCallback(() => {
    if (!reporte) return;
    const rows = formatearReporteCSV(reporte);
    const csvContent = rows.map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${reporte.periodo.label.replace(/\s/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado", description: "Reporte descargado como CSV" });
  }, [reporte, toast]);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Reportes Mensuales</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">
            Órdenes, ingresos e inventario consumido por período
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="h-9 w-9"
            >
              <ChevronLeft size={16} />
            </Button>
            <div className="text-center min-w-[140px]">
              <p className="font-heading font-bold text-lg">{MESES[month - 1]} {year}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-9 w-9"
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36 bg-card border-border">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28 bg-card border-border">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleGenerar} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <BarChart size={16} />
              )}
              {loading ? "Generando..." : "Generar Reporte"}
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Report Content */}
      {reporte && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                <ClipboardList size={12} /> Órdenes
              </p>
              <p className="text-2xl font-heading font-bold">{reporte.ordenes.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                <span className="text-emerald-400 font-semibold">{reporte.ordenes.entregadas} entregadas</span>
                {" · "}
                <span className="text-primary font-semibold">{reporte.ordenes.activas} activas</span>
              </p>
            </div>

            <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                <DollarSign size={12} /> Ingresos
              </p>
              <p className="text-xl font-heading font-bold text-primary truncate">
                ₡{(reporte.ingresos.total || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Monto final: ₡{(reporte.ingresos.monto_final || 0).toLocaleString("es-CR")}
              </p>
            </div>

            <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                <Package size={12} /> Inventario
              </p>
              <p className="text-2xl font-heading font-bold">{reporte.inventario.total_articulos}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                unidades consumidas por ₡
                {(reporte.inventario.costo_total || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                <TrendingUp size={12} /> Margen Bruto
              </p>
              <p className="text-xl font-heading font-bold text-emerald-400">
                ₡{Math.max(0, (reporte.ingresos.total || 0) - (reporte.inventario.costo_total || 0)).toLocaleString("es-CR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ingresos − inventario
              </p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportarTxt} className="gap-2 border-border">
              <FileText size={14} /> Exportar TXT
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportarCSV} className="gap-2 border-border">
              <Download size={14} /> Exportar CSV
            </Button>
          </div>

          {/* ─── Órdenes del período ─── */}
          <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-heading font-bold uppercase tracking-wide text-sm flex items-center gap-2">
                <ClipboardList size={16} className="text-primary" />
                Órdenes del Período ({reporte.ordenes.lista.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground text-[11px] uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Placa</th>
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Vehículo</th>
                    <th className="text-left px-4 py-3 font-medium">Ingreso</th>
                    <th className="text-left px-4 py-3 font-medium">Estado</th>
                    <th className="text-right px-4 py-3 font-medium">Cotizado</th>
                    <th className="text-right px-4 py-3 font-medium">Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {reporte.ordenes.lista.map((o, i) => (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-heading font-bold">{o.placa || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.cliente || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{o.marca} {o.modelo} {o.anio}</td>
                      <td className="px-4 py-3 text-xs">{formatDisplayDateTime(o.fecha_ingreso)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          o.estado_kanban === "Entregado"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }`}>{o.estado_kanban}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">₡{(o.monto_cotizado || 0).toLocaleString("es-CR")}</td>
                      <td className="px-4 py-3 text-right font-heading font-bold text-primary">₡{(o.monto_final || 0).toLocaleString("es-CR")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/50 bg-foreground/[0.02]">
                    <td colSpan={6} className="px-4 py-3 text-right font-heading font-bold uppercase text-xs">Totales</td>
                    <td className="px-4 py-3 text-right font-heading font-bold text-primary">₡{(reporte.ingresos.monto_cotizado || 0).toLocaleString("es-CR")}</td>
                    <td className="px-4 py-3 text-right font-heading font-bold text-primary">₡{(reporte.ingresos.monto_final || 0).toLocaleString("es-CR")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ─── Ingresos por orden ─── */}
          <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-heading font-bold uppercase tracking-wide text-sm flex items-center gap-2">
                <DollarSign size={16} className="text-primary" />
                Ingresos por Orden ({reporte.ingresos.por_orden.length})
              </h3>
            </div>
            <div className="divide-y divide-border/30">
              {reporte.ingresos.por_orden.length > 0 ? (
                reporte.ingresos.por_orden.map((o, i) => (
                  <div key={o.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-muted-foreground text-xs w-5 text-right">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="font-heading font-bold text-sm">{o.placa}</p>
                        <p className="text-xs text-muted-foreground truncate">{o.cliente} {o.numero_orden ? `· #${o.numero_orden}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-heading font-bold text-primary">₡{(o.monto_final || o.monto_cotizado).toLocaleString("es-CR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-muted-foreground">{o.estado}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-6 text-center text-muted-foreground text-sm">
                  No hay órdenes con montos registrados en este período.
                </div>
              )}
            </div>
          </div>

          {/* ─── Inventario consumido ─── */}
          <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-heading font-bold uppercase tracking-wide text-sm flex items-center gap-2">
                <Package size={16} className="text-primary" />
                Inventario Consumido ({reporte.inventario.por_producto.length} productos)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground text-[11px] uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Producto</th>
                    <th className="text-left px-4 py-3 font-medium">Código</th>
                    <th className="text-right px-4 py-3 font-medium">Cantidad</th>
                    <th className="text-right px-4 py-3 font-medium">Costo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {reporte.inventario.por_producto.length > 0 ? (
                    reporte.inventario.por_producto.map((p, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-medium">{p.nombre}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{p.codigo || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{p.cantidad}</td>
                        <td className="px-4 py-3 text-right font-heading font-bold">₡{(p.costo_total || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">
                        No hay movimientos de inventario registrados en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
                {reporte.inventario.por_producto.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-border/50 bg-foreground/[0.02]">
                      <td colSpan={2} className="px-4 py-3 text-right font-heading font-bold uppercase text-xs">Totales</td>
                      <td className="px-4 py-3 text-right font-heading font-bold">{reporte.inventario.total_articulos}</td>
                      <td className="px-4 py-3 text-right font-heading font-bold text-primary">₡{(reporte.inventario.costo_total || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ─── Detalle de movimientos ─── */}
          {reporte.inventario.detalle.length > 0 && (
            <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-heading font-bold uppercase tracking-wide text-sm flex items-center gap-2">
                  <Building2 size={16} className="text-primary" />
                  Detalle de Movimientos ({reporte.inventario.detalle.length})
                </h3>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground text-[11px] uppercase tracking-wider sticky top-0 bg-card">
                      <th className="text-left px-4 py-3 font-medium">Producto</th>
                      <th className="text-right px-4 py-3 font-medium">Cantidad</th>
                      <th className="text-left px-4 py-3 font-medium">OT</th>
                      <th className="text-left px-4 py-3 font-medium">Motivo</th>
                      <th className="text-left px-4 py-3 font-medium">Fecha</th>
                      <th className="text-left px-4 py-3 font-medium">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {reporte.inventario.detalle.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 text-xs font-medium">{m.producto}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{m.cantidad}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.numero_orden || m.orden_id?.slice(0, 8) || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.motivo || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDisplayDateTime(m.fecha)}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.usuario || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!reporte && !loading && !error && (
        <div className="h-80 flex flex-col items-center justify-center text-muted-foreground bg-card/70 backdrop-blur-md border border-white/10 rounded-xl">
          <BarChart size={48} className="mb-3 opacity-20" />
          <p className="text-lg font-heading font-bold mb-1">Seleccione un período</p>
          <p className="text-sm">y presione <strong>Generar Reporte</strong> para ver estadísticas de {MESES[month - 1]} {year}.</p>
        </div>
      )}
    </div>
  );
}