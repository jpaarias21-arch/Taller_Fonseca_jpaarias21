import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Plus, Search, AlertTriangle, TrendingDown, TrendingUp, Boxes, FlaskConical, DollarSign, Lock } from "lucide-react";
import { useRole } from "@/lib/useRole";

const CATEGORIAS = ["Pintura", "Lija", "Transparente", "Masilla", "Primer", "Thinner", "Repuesto Mecánico", "Herramienta", "Otro"];
const UNIDADES = ["Litro", "Galón", "Unidad", "Kilo", "Metro", "Caja"];

function ProductoModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || {
    nombre: "", codigo: "", tipo: "Consumible Químico", categoria: "Pintura",
    unidad: "Litro", stock_actual: 0, stock_minimo: 0, precio_unitario: 0, proveedor: "",
  });
  useEffect(() => { if (initial) setForm(initial); }, [initial]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">{initial?.id ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">Nombre *</label>
              <Input value={form.nombre} onChange={e => set("nombre", e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="form-label">Código</label>
              <Input value={form.codigo} onChange={e => set("codigo", e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="form-label">Tipo *</label>
              <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Repuesto Físico">Repuesto Físico</SelectItem>
                  <SelectItem value="Consumible Químico">Consumible Químico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">Categoría</label>
              <Select value={form.categoria} onValueChange={v => set("categoria", v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">Unidad</label>
              <Select value={form.unidad} onValueChange={v => set("unidad", v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">Stock Actual</label>
              <Input type="number" min={0} value={form.stock_actual} onChange={e => set("stock_actual", Number(e.target.value))} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="form-label">Stock Mínimo</label>
              <Input type="number" min={0} value={form.stock_minimo} onChange={e => set("stock_minimo", Number(e.target.value))} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="form-label">Precio Unitario ₡</label>
              <Input type="number" min={0} step="0.01" value={form.precio_unitario} onChange={e => set("precio_unitario", Number(e.target.value))} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="form-label">Proveedor</label>
              <Input value={form.proveedor} onChange={e => set("proveedor", e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" className="border-border" onClick={onClose}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => onSave(form)}>
              {initial?.id ? "Actualizar" : "Crear Producto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MovimientoModal({ open, onClose, producto, ordenes, onSave }) {
  const [tipo, setTipo] = useState("Entrada");
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [ordenId, setOrdenId] = useState("");
  const [ordenNumero, setOrdenNumero] = useState("");

  const handleSave = () => {
    if (tipo === "Salida" && !ordenId) return;
    onSave({ tipo, cantidad, motivo, ordenId, ordenNumero });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Registrar Movimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-sm text-muted-foreground font-medium">{producto?.nombre}</p>
          <div>
            <label className="form-label">Tipo</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="Entrada">Entrada</SelectItem>
                <SelectItem value="Salida">Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label">Cantidad</label>
            <Input type="number" min={1} value={cantidad} onChange={e => setCantidad(Number(e.target.value))} className="bg-secondary border-border" />
          </div>
          {tipo === "Salida" && (
            <div>
              <label className="form-label flex items-center gap-1">
                <AlertTriangle size={11} className="text-yellow-400" /> Orden de Trabajo * (Obligatorio para salidas)
              </label>
              <Select value={ordenId} onValueChange={v => {
                setOrdenId(v);
                const ord = ordenes.find(o => o.id === v);
                setOrdenNumero(ord?.numero_orden || "");
              }}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Seleccionar OT activa..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ordenes.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.numero_orden} — {o.placa} ({o.cliente_nombre})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipo === "Salida" && !ordenId && (
                <p className="text-destructive text-xs mt-1">Debe vincular a una Orden de Trabajo activa</p>
              )}
            </div>
          )}
          <div>
            <label className="form-label">Motivo / Notas</label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Descripción del movimiento..." className="bg-secondary border-border" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" className="border-border" onClick={onClose}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={tipo === "Salida" && !ordenId}>
              Registrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Inventario() {
  const { toast } = useToast();
  const { canManageInventory, roleLabel, roleColor } = useRole();
  const [productos, setProductos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [modalProd, setModalProd] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [modalMov, setModalMov] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Inventario.list(),
      base44.entities.OrdenTrabajo.filter({}).then(all => all.filter(o => o.estado_kanban !== "Entregado")),
    ]).then(([prods, ords]) => {
      setProductos(prods);
      setOrdenes(ords);
      setLoading(false);
    });
  }, []);

  const saveProd = async (form) => {
    if (form.id) {
      await base44.entities.Inventario.update(form.id, form);
      setProductos(prev => prev.map(p => p.id === form.id ? { ...p, ...form } : p));
      toast({ title: "Producto actualizado" });
    } else {
      const nuevo = await base44.entities.Inventario.create(form);
      setProductos(prev => [...prev, nuevo]);
      toast({ title: "Producto creado" });
    }
    setModalProd(false);
    setEditProd(null);
  };

  const saveMovimiento = async ({ tipo, cantidad, motivo, ordenId, ordenNumero }) => {
    const prod = modalMov;
    if (tipo === "Salida" && !ordenId) {
      toast({ title: "Error", description: "Debe vincular una Orden de Trabajo activa para salidas.", variant: "destructive" });
      return;
    }
    const nuevoStock = tipo === "Entrada"
      ? prod.stock_actual + cantidad
      : prod.stock_actual - cantidad;
    if (nuevoStock < 0) {
      toast({ title: "Stock insuficiente", description: "No hay suficiente stock para este despacho.", variant: "destructive" });
      return;
    }
    await Promise.all([
      base44.entities.Inventario.update(prod.id, { stock_actual: nuevoStock }),
      base44.entities.MovimientoInventario.create({
        inventario_id: prod.id,
        producto_nombre: prod.nombre,
        tipo_movimiento: tipo,
        cantidad,
        orden_id: ordenId || null,
        numero_orden: ordenNumero || null,
        motivo,
        usuario_nombre: "Sistema",
      }),
    ]);
    setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, stock_actual: nuevoStock } : p));
    toast({ title: "Movimiento registrado", description: `${tipo}: ${cantidad} ${prod.unidad}(s) de ${prod.nombre}` });
    setModalMov(null);
  };

  const filtered = productos.filter(p => {
    const q = search.toLowerCase();
    const match = p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q);
    const matchTipo = filterTipo === "todos" || p.tipo === filterTipo;
    return match && matchTipo;
  });

  const bajoStock = productos.filter(p => p.stock_actual <= p.stock_minimo);
  const totalValor = productos.reduce((acc, p) => acc + (p.stock_actual * (p.precio_unitario || 0)), 0);
  const repuestos = productos.filter(p => p.tipo === "Repuesto Físico").length;
  const consumibles = productos.filter(p => p.tipo === "Consumible Químico").length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Inventario</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Repuestos físicos y consumibles químicos</p>
        </div>
        {canManageInventory ? (
          <Button onClick={() => { setEditProd(null); setModalProd(true); }}
            className="bg-primary text-primary-foreground font-semibold gap-2 uppercase tracking-wide">
            <Plus size={16} /> Nuevo Producto
          </Button>
        ) : (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${roleColor}`}>
            <Lock size={14} /> {roleLabel} — Solo lectura
          </div>
        )}
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total SKUs</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-heading font-bold text-primary">{productos.length}</span>
            <Boxes size={16} className="text-muted-foreground mb-1" />
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border-l-4 border-yellow-500 border-y border-r border-white/10 rounded-xl p-4">
          <p className="text-yellow-400 text-xs uppercase tracking-wider mb-1">Stock Bajo</p>
          <div className="flex items-end gap-2 text-yellow-400">
            <span className="text-3xl font-heading font-bold">{bajoStock.length}</span>
            <AlertTriangle size={16} className="mb-1" />
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Repuestos / Químicos</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-heading font-bold text-blue-400">{repuestos}</span>
            <span className="text-muted-foreground text-sm mb-1">/ {consumibles}</span>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Valor Total</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-heading font-bold text-green-400">₡{totalValor.toFixed(0)}</span>
            <DollarSign size={16} className="text-muted-foreground mb-1" />
          </div>
        </div>
      </div>

      {/* Low stock alert banner */}
      {bajoStock.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span><strong>{bajoStock.length}</strong> producto(s) con stock bajo: {bajoStock.map(p => p.nombre).join(", ")}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar producto o código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full sm:w-52 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="Repuesto Físico">Repuesto Físico</SelectItem>
            <SelectItem value="Consumible Químico">Consumible Químico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider">Producto</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Tipo</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Categoría</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider">Stock</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Precio Unit. (₡)</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((prod, idx) => {
                  const bajo = prod.stock_actual <= prod.stock_minimo;
                  return (
                    <tr key={prod.id}
                      className={`border-b border-border/40 transition-colors ${bajo ? "bg-yellow-500/5 hover:bg-yellow-500/10" : idx % 2 === 0 ? "hover:bg-secondary/20" : "bg-white/[0.02] hover:bg-secondary/20"}`}>
                      {/* Left accent bar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-1 h-8 rounded-full flex-shrink-0 ${bajo ? "bg-yellow-400" : prod.tipo === "Repuesto Físico" ? "bg-blue-500" : "bg-purple-500"}`} />
                          <div>
                            <p className="font-medium">{prod.nombre}</p>
                            {prod.codigo && <p className="text-xs text-muted-foreground">{prod.codigo}</p>}
                          </div>
                          {bajo && <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className={`station-badge border text-xs ${prod.tipo === "Consumible Químico" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>
                          {prod.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs">{prod.categoria}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold font-heading text-lg ${bajo ? "text-yellow-400" : "text-foreground"}`}>
                          {prod.stock_actual}
                        </span>
                        <span className="text-muted-foreground text-xs ml-1">{prod.unidad}</span>
                        <p className="text-xs text-muted-foreground">mín: {prod.stock_minimo}</p>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">₡{Number(prod.precio_unitario || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          {canManageInventory && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:bg-green-500/10 gap-1"
                                onClick={() => setModalMov(prod)}>
                                <TrendingDown size={12} /> Mov.
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditProd(prod); setModalProd(true); }}>
                                Editar
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    {search ? "Sin resultados para la búsqueda" : "No hay productos en el inventario"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProductoModal open={modalProd} onClose={() => { setModalProd(false); setEditProd(null); }} onSave={saveProd} initial={editProd} />
      {modalMov && (
        <MovimientoModal open={!!modalMov} onClose={() => setModalMov(null)} producto={modalMov} ordenes={ordenes} onSave={saveMovimiento} />
      )}
    </div>
  );
}