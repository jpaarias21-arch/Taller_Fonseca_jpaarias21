import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ShoppingCart, Search, Filter, CheckCircle, Clock, Package } from "lucide-react";

const ESTADO_COLORS = {
  "Pendiente": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Ordenado": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Recibido": "bg-green-500/20 text-green-400 border-green-500/30",
  "Cancelado": "bg-destructive/20 text-red-400 border-destructive/30",
};

export default function Compras() {
  const { toast } = useToast();
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    base44.entities.RequerimientoCompra.list("-created_date", 200).then(data => {
      setReqs(data);
      setLoading(false);
    });
  }, []);

  const updateEstado = async (id, nuevoEstado) => {
    setUpdating(id);
    const extra = {};
    if (nuevoEstado === "Ordenado") extra.fecha_ordenado = new Date().toISOString().split("T")[0];
    if (nuevoEstado === "Recibido") extra.fecha_recibido = new Date().toISOString().split("T")[0];
    await base44.entities.RequerimientoCompra.update(id, { estado: nuevoEstado, ...extra });
    setReqs(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado, ...extra } : r));
    toast({ title: "Estado actualizado", description: `Requerimiento marcado como: ${nuevoEstado}` });
    setUpdating(null);
  };

  const filtered = reqs.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.pieza_nombre?.toLowerCase().includes(q) || r.numero_orden?.toLowerCase().includes(q);
    const matchEstado = filterEstado === "todos" || r.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const stats = {
    pendiente: reqs.filter(r => r.estado === "Pendiente").length,
    ordenado: reqs.filter(r => r.estado === "Ordenado").length,
    recibido: reqs.filter(r => r.estado === "Recibido").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Requerimientos de Compra</h1>
        <p className="text-muted-foreground text-sm">Generados automáticamente al aprobar cotizaciones</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-yellow-500/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pendientes</p>
            <Clock size={14} className="text-yellow-400" />
          </div>
          <p className="text-3xl font-heading font-bold text-yellow-400">{stats.pendiente}</p>
        </div>
        <div className="stat-card border-blue-500/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Ordenados</p>
            <ShoppingCart size={14} className="text-blue-400" />
          </div>
          <p className="text-3xl font-heading font-bold text-blue-400">{stats.ordenado}</p>
        </div>
        <div className="stat-card border-green-500/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Recibidos</p>
            <CheckCircle size={14} className="text-green-400" />
          </div>
          <p className="text-3xl font-heading font-bold text-green-400">{stats.recibido}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por pieza u orden..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="Ordenado">Ordenado</SelectItem>
            <SelectItem value="Recibido">Recibido</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
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
                          <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                            disabled={updating === req.id} onClick={() => updateEstado(req.id, "Ordenado")}>
                            Ordenar
                          </Button>
                        )}
                        {req.estado === "Ordenado" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
                            disabled={updating === req.id} onClick={() => updateEstado(req.id, "Recibido")}>
                            Recibido
                          </Button>
                        )}
                        {req.estado !== "Cancelado" && req.estado !== "Recibido" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            disabled={updating === req.id} onClick={() => updateEstado(req.id, "Cancelado")}>
                            Cancelar
                          </Button>
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
    </div>
  );
}