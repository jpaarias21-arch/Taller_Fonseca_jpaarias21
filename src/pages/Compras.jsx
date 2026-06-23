// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ShoppingCart, Search, CheckCircle, Clock, Package, CircleCheck, Eye } from "lucide-react";
import { formatColones } from "@/lib/utils";

const ESTADO_COLORS = {
  "Pendiente": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Ordenado": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Recibido": "bg-green-500/20 text-green-400 border-green-500/30",
  "Cancelado": "bg-destructive/20 text-red-400 border-destructive/30",
};

const PROVEEDORES_DEMO = ["Repuestos CR", "AutoPartes San Jose", "Importadora Norte", "Taller Aliado"];

function RegistrarCompraModal({ open, onClose, onConfirm, req, loading }) {
  const [proveedor, setProveedor] = useState("");
  const [costo, setCosto] = useState("");

  useEffect(() => {
    if (!open) {
      setProveedor("");
      setCosto("");
      return;
    }
    setProveedor(req?.proveedor || "");
    setCosto(req?.precio_compra ? String(req.precio_compra) : "");
  }, [open, req]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Registrar Compra</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pieza</p>
            <p className="font-medium">{req?.pieza_nombre || "-"}</p>
            <p className="text-xs text-muted-foreground">OT: {req?.numero_orden || req?.orden_id?.slice(0, 8) || "-"}</p>
          </div>

          <div>
            <label className="form-label">Proveedor *</label>
            <Select value={proveedor} onValueChange={setProveedor}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Seleccionar proveedor..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {PROVEEDORES_DEMO.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="form-label">Costo Real de Compra *</label>
            <Input
              type="number"
              min={0}
              step="1"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="Ej: 35000"
              className="bg-secondary border-border"
            />
            {costo && (
              <p className="text-xs text-muted-foreground mt-1">{formatColones(Number(costo || 0), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" className="border-border" onClick={onClose}>Cancelar</Button>
            <Button
              className="bg-primary text-primary-foreground"
              disabled={loading || !proveedor || Number(costo) <= 0}
              onClick={() => onConfirm({ proveedor, precio_compra: Number(costo) })}
            >
              Confirmar Orden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Compras() {
  const { toast } = useToast();
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("Pendiente");
  const [updating, setUpdating] = useState(null);
  const [reqCompra, setReqCompra] = useState(null);

  useEffect(() => {
    base44.entities.RequerimientoCompra.list("-created_date", 200).then(data => {
      setReqs(data);
      setLoading(false);
    });
  }, []);

  const updateEstado = async (id, nuevoEstado, extraPayload = {}) => {
    setUpdating(id);
    const extra = { ...extraPayload };
    if (nuevoEstado === "Ordenado") extra.fecha_ordenado = new Date().toISOString().split("T")[0];
    if (nuevoEstado === "Recibido") extra.fecha_recibido = new Date().toISOString().split("T")[0];
    try {
      await base44.entities.RequerimientoCompra.update(id, { estado: nuevoEstado, ...extra });
      setReqs(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado, ...extra } : r));
      toast({ title: "Estado actualizado", description: `Requerimiento marcado como: ${nuevoEstado}` });
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error?.message || "Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const searchLower = search.toLowerCase();

  const filtered = useMemo(() => {
    return reqs.filter((r) => {
      const matchSearch =
        r.pieza_nombre?.toLowerCase().includes(searchLower) ||
        r.numero_orden?.toLowerCase().includes(searchLower);
      const matchEstado = filterEstado === "todos" || r.estado === filterEstado;
      return matchSearch && matchEstado;
    });
  }, [reqs, searchLower, filterEstado]);

  const stats = useMemo(() => {
    return {
      pendiente: filtered.filter((r) => r.estado === "Pendiente").length,
      ordenado: filtered.filter((r) => r.estado === "Ordenado").length,
      recibido: filtered.filter((r) => r.estado === "Recibido").length,
    };
  }, [filtered]);

  const handleConfirmarCompra = async ({ proveedor, precio_compra }) => {
    if (!reqCompra) return;
    await updateEstado(reqCompra.id, "Ordenado", { proveedor, precio_compra });
    setReqCompra(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Requerimientos de Compra</h1>
        <p className="text-muted-foreground text-sm">Generados automáticamente al aprobar cotizaciones</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setFilterEstado("Pendiente")}
          className={`stat-card border-yellow-500/30 text-left transition-all ${filterEstado === "Pendiente" ? "ring-2 ring-yellow-400/40" : "hover:border-yellow-500/50"}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pendientes</p>
            <Clock size={14} className="text-yellow-400" />
          </div>
          <p className="text-3xl font-heading font-bold text-yellow-400">{filterEstado === "Pendiente" ? filtered.length : reqs.filter((r) => r.estado === "Pendiente").length}</p>
        </button>
        <button
          type="button"
          onClick={() => setFilterEstado("Ordenado")}
          className={`stat-card border-blue-500/30 text-left transition-all ${filterEstado === "Ordenado" ? "ring-2 ring-blue-400/40" : "hover:border-blue-500/50"}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Ordenados</p>
            <ShoppingCart size={14} className="text-blue-400" />
          </div>
          <p className="text-3xl font-heading font-bold text-blue-400">{filterEstado === "Ordenado" ? filtered.length : reqs.filter((r) => r.estado === "Ordenado").length}</p>
        </button>
        <button
          type="button"
          onClick={() => setFilterEstado("Recibido")}
          className={`stat-card border-green-500/30 text-left transition-all ${filterEstado === "Recibido" ? "ring-2 ring-green-400/40" : "hover:border-green-500/50"}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Recibidos</p>
            <CheckCircle size={14} className="text-green-400" />
          </div>
          <p className="text-3xl font-heading font-bold text-green-400">{filterEstado === "Recibido" ? filtered.length : reqs.filter((r) => r.estado === "Recibido").length}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por pieza u orden..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="w-full sm:w-44 text-xs text-muted-foreground rounded-lg border border-border bg-card px-3 py-2 flex items-center justify-between">
          <span>Vista actual</span>
          <span className="font-semibold text-foreground">{filterEstado}</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="data-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Pieza</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Orden</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Tipo</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase hidden md:table-cell">Descripción</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Estado</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-3 px-4 font-medium">{req.pieza_nombre}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{req.numero_orden || req.orden_id?.slice(0, 8)}</td>
                    <td className="py-3 px-4">
                      <span className="station-badge bg-orange-500/20 text-orange-400 border border-orange-500/30">{req.tipo_repuesto}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell max-w-xs truncate">{req.descripcion_dano || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`station-badge border ${ESTADO_COLORS[req.estado] || ""}`}>{req.estado}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        {req.estado === "Pendiente" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10"
                            disabled={updating === req.id} onClick={() => setReqCompra(req)}>
                            Cotizar
                          </Button>
                        )}
                        {req.estado === "Ordenado" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
                            disabled={updating === req.id} onClick={() => updateEstado(req.id, "Recibido")}>
                            Recibir Pieza
                          </Button>
                        )}
                        {req.estado === "Recibido" && (
                          <div className="h-7 px-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                            <CircleCheck size={12} /> Listo
                          </div>
                        )}
                        {req.estado === "Cancelado" && (
                          <div className="h-7 px-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Eye size={12} /> Sin acción
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">
                    {search ? "No se encontraron resultados" : "No hay requerimientos de compra"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RegistrarCompraModal
        open={!!reqCompra}
        onClose={() => setReqCompra(null)}
        onConfirm={handleConfirmarCompra}
        req={reqCompra}
        loading={!!updating}
      />
    </div>
  );
}