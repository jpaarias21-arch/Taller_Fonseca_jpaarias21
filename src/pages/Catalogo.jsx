import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search, Wrench, Pencil, ToggleLeft, ToggleRight, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRole } from "@/lib/useRole";

const CATEGORIAS = [
  "Carrocería Frontal", "Carrocería Lateral", "Carrocería Trasera",
  "Techo y Piso", "Iluminación", "Vidrios", "Mecánica Visible", "Interior"
];

function PiezaModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || { nombre: "", categoria: "Carrocería Frontal", codigo: "", activo: true });
  useEffect(() => { if (initial) setForm(initial); else setForm({ nombre: "", categoria: "Carrocería Frontal", codigo: "", activo: true }); }, [initial]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">{initial?.id ? "Editar Pieza" : "Nueva Pieza"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="form-label">Nombre de la Pieza *</label>
            <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="bg-secondary border-border" placeholder="Ej: Bómper Delantero" />
          </div>
          <div>
            <label className="form-label">Categoría *</label>
            <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label">Código Interno</label>
            <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="bg-secondary border-border" placeholder="P-001" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.activo} onCheckedChange={v => setForm(f => ({ ...f, activo: v }))} />
            <span className="text-sm text-muted-foreground">Activo (disponible en avalúos)</span>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" className="border-border" onClick={onClose}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => onSave(form)} disabled={!form.nombre}>
              {initial?.id ? "Actualizar" : "Crear Pieza"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Catalogo() {
  const { toast } = useToast();
  const { canManageCatalog, roleLabel, roleColor } = useRole();
  const [piezas, setPiezas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("todas");
  const [modal, setModal] = useState(false);
  const [editPieza, setEditPieza] = useState(null);

  useEffect(() => {
    base44.entities.PiezaCatalogo.list().then(data => {
      setPiezas(data);
      setLoading(false);
    });
  }, []);

  const savePieza = async (form) => {
    if (form.id) {
      await base44.entities.PiezaCatalogo.update(form.id, form);
      setPiezas(prev => prev.map(p => p.id === form.id ? { ...p, ...form } : p));
      toast({ title: "Pieza actualizada" });
    } else {
      const nueva = await base44.entities.PiezaCatalogo.create(form);
      setPiezas(prev => [...prev, nueva]);
      toast({ title: "Pieza creada en el catálogo" });
    }
    setModal(false);
    setEditPieza(null);
  };

  const toggleActivo = async (pieza) => {
    await base44.entities.PiezaCatalogo.update(pieza.id, { activo: !pieza.activo });
    setPiezas(prev => prev.map(p => p.id === pieza.id ? { ...p, activo: !p.activo } : p));
  };

  const filtered = piezas.filter(p => {
    const q = search.toLowerCase();
    const match = p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q);
    const matchCat = filterCat === "todas" || p.categoria === filterCat;
    return match && matchCat;
  });

  const grouped = CATEGORIAS.reduce((acc, cat) => {
    const items = filtered.filter(p => p.categoria === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Catálogo de Piezas</h1>
          <p className="text-muted-foreground text-sm">
            Maestro estandarizado — {piezas.filter(p => p.activo).length} piezas activas
          </p>
        </div>
        {canManageCatalog ? (
          <Button onClick={() => { setEditPieza(null); setModal(true); }} className="bg-primary text-primary-foreground font-semibold gap-2">
            <Plus size={16} /> Nueva Pieza
          </Button>
        ) : (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${roleColor}`}>
            <Lock size={14} /> {roleLabel} — Solo lectura
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar pieza..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-56 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="data-card">
              <h3 className="font-heading font-bold uppercase tracking-wide text-primary mb-3 flex items-center gap-2">
                <Wrench size={14} /> {cat} ({items.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map(p => (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${p.activo ? "bg-secondary/40 border-border" : "bg-secondary/10 border-border/30 opacity-60"}`}>
                    <div>
                      <p className={`text-sm font-medium ${!p.activo ? "line-through text-muted-foreground" : ""}`}>{p.nombre}</p>
                      {p.codigo && <p className="text-xs text-muted-foreground">{p.codigo}</p>}
                    </div>
                    {canManageCatalog && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActivo(p)} className="p-1 hover:text-primary transition-colors text-muted-foreground" title={p.activo ? "Desactivar" : "Activar"}>
                          {p.activo ? <ToggleRight size={16} className="text-primary" /> : <ToggleLeft size={16} />}
                        </button>
                        <button onClick={() => { setEditPieza(p); setModal(true); }} className="p-1 hover:text-primary transition-colors text-muted-foreground">
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              {search ? "No se encontraron piezas con ese criterio" : "El catálogo está vacío. Cree piezas con el botón de arriba."}
            </div>
          )}
        </div>
      )}

      <PiezaModal open={modal} onClose={() => { setModal(false); setEditPieza(null); }} onSave={savePieza} initial={editPieza} />
    </div>
  );
}