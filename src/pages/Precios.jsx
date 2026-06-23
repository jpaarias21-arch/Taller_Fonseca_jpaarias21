// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Search, Pencil, Check, X, Lock, Tag } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { formatColones } from "@/lib/utils";

export default function Precios() {
  const { toast } = useToast();
  const { canEditPrices, roleLabel, roleColor } = useRole();
  const isAdmin = canEditPrices;
  const [piezas, setPiezas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const load = async () => {
      const cats = await base44.entities.PiezaCatalogo.list("nombre", 2000);
      setPiezas(cats);
      setLoading(false);
    };
    load();
  }, []);

  // Las tarifas se leen directamente desde la tabla pieza.
  const merged = useMemo(() => {
    return piezas.map((p) => {
      return {
        pieza_id: p.id,
        pieza_nombre: p.nombre,
        pieza_categoria: p.categoria,
        precio_base: p.precio_base ?? 0,
        margen_porcentaje: p.margen_porcentaje ?? 0,
        precio_final: p.precio_final ?? 0,
        precio_hora_dm: p.precio_hora_dm ?? 0,
        precio_hora_reparacion: p.precio_hora_reparacion ?? 0,
        notas: p.notas ?? "",
      };
    });
  }, [piezas]);

  const searchLower = search.toLowerCase();

  const filtered = useMemo(() => {
    return merged.filter((p) =>
      p.pieza_nombre.toLowerCase().includes(searchLower) ||
      p.pieza_categoria?.toLowerCase().includes(searchLower)
    );
  }, [merged, searchLower]);

  const startEdit = (item) => {
    if (!isAdmin) {
      toast({
        title: "Sin permisos",
        description: "Solo el Dueño puede modificar precios.",
        variant: "destructive",
      });
      return;
    }
    setEditingId(item.pieza_id);
    setEditForm({
      precio_base: item.precio_base,
      margen_porcentaje: item.margen_porcentaje,
      precio_final: item.precio_final,
      precio_hora_dm: item.precio_hora_dm,
      precio_hora_reparacion: item.precio_hora_reparacion,
      notas: item.notas,
    });
  };

  const calcFinal = (base, margen) => {
    const b = parseFloat(base) || 0;
    const m = parseFloat(margen) || 0;
    return +(b + b * m / 100).toFixed(2);
  };

  const handleEditChange = (key, val) => {
    setEditForm(prev => {
      const updated = { ...prev, [key]: val };
      if (key === "precio_base" || key === "margen_porcentaje") {
        updated.precio_final = calcFinal(
          key === "precio_base" ? val : prev.precio_base,
          key === "margen_porcentaje" ? val : prev.margen_porcentaje
        );
      }
      return updated;
    });
  };

  const saveEdit = async (item) => {
    if (!isAdmin) {
      toast({
        title: "Sin permisos",
        description: "Solo el Dueño puede modificar precios.",
        variant: "destructive",
      });
      return;
    }

    const piezaId = String(item.pieza_id);

    const data = {
      precio_base: parseFloat(editForm.precio_base) || 0,
      margen_porcentaje: parseFloat(editForm.margen_porcentaje) || 0,
      precio_final: parseFloat(editForm.precio_final) || 0,
      precio_hora_dm: parseFloat(editForm.precio_hora_dm) || 0,
      precio_hora_reparacion: parseFloat(editForm.precio_hora_reparacion) || 0,
      notas: editForm.notas || "",
    };

    try {
      const saved = await base44.entities.PiezaCatalogo.update(item.pieza_id, data);
      setPiezas(prev => prev.map(p => String(p.id) === piezaId ? { ...p, ...saved } : p));

      toast({ title: "Precio guardado", description: `${item.pieza_nombre} actualizado.` });
      setEditingId(null);
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  // Grouped by category
  const groupedByCategory = useMemo(() => {
    return filtered.reduce((acc, item) => {
      const key = item.pieza_categoria || "Sin categoría";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [filtered]);

  const categories = useMemo(() => Object.keys(groupedByCategory).sort(), [groupedByCategory]);
  const formatCRC = (value) => formatColones(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Lista de Precios</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? "Modo administrador — puede editar precios y márgenes"
              : "Solo lectura — los precios son definidos por el administrador"}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${roleColor}`}>
          {!isAdmin && <Lock size={14} />}
          {roleLabel}{!isAdmin ? " — Solo lectura" : " — Puede editar"}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar pieza o categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {/* Table by category */}
      {categories.map(cat => {
        const items = groupedByCategory[cat] || [];
        return (
          <div key={cat} className="data-card p-0 overflow-hidden">
            {/* Category header */}
            <div className="px-4 py-2.5 bg-secondary/50 border-b border-border">
              <h3 className="font-heading font-bold uppercase text-sm tracking-wide text-primary flex items-center gap-2">
                <Tag size={13} /> {cat} ({items.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left py-2 px-4 text-muted-foreground font-semibold text-xs uppercase">Pieza</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-semibold text-xs uppercase">Precio Base ₡</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-semibold text-xs uppercase">Margen %</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-semibold text-xs uppercase">Precio Final ₡</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-semibold text-xs uppercase hidden md:table-cell">Hr D&M ₡</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-semibold text-xs uppercase hidden md:table-cell">Hr Rep. ₡</th>
                    {isAdmin && <th className="text-right py-2 px-4 text-muted-foreground font-semibold text-xs uppercase">Acción</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const isEditing = editingId === item.pieza_id;
                    return (
                      <tr key={item.pieza_id} className={`border-b border-border/50 hover:bg-secondary/10 ${isEditing ? "bg-primary/5" : ""}`}>
                        <td className="py-2.5 px-4 font-medium">{item.pieza_nombre}</td>

                        {isEditing ? (
                          <>
                            <td className="py-2 px-3"><Input type="number" min={0} step="0.01" value={editForm.precio_base} onChange={e => handleEditChange("precio_base", e.target.value)} className="bg-card border-border h-7 text-xs text-right w-24 ml-auto" /></td>
                            <td className="py-2 px-3"><Input type="number" min={0} max={100} step="0.1" value={editForm.margen_porcentaje} onChange={e => handleEditChange("margen_porcentaje", e.target.value)} className="bg-card border-border h-7 text-xs text-right w-20 ml-auto" /></td>
                            <td className="py-2 px-3 text-right font-bold text-primary text-sm">{formatCRC(editForm.precio_final || 0)}</td>
                            <td className="py-2 px-3 hidden md:table-cell"><Input type="number" min={0} step="0.01" value={editForm.precio_hora_dm} onChange={e => handleEditChange("precio_hora_dm", e.target.value)} className="bg-card border-border h-7 text-xs text-right w-20 ml-auto" /></td>
                            <td className="py-2 px-3 hidden md:table-cell"><Input type="number" min={0} step="0.01" value={editForm.precio_hora_reparacion} onChange={e => handleEditChange("precio_hora_reparacion", e.target.value)} className="bg-card border-border h-7 text-xs text-right w-20 ml-auto" /></td>
                            <td className="py-2 px-4 text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400 hover:bg-green-500/10" onClick={() => saveEdit(item)}><Check size={14} /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={cancelEdit}><X size={14} /></Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">{formatCRC(item.precio_base)}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">{item.margen_porcentaje}%</td>
                            <td className="py-2.5 px-3 text-right font-bold text-primary">{formatCRC(item.precio_final)}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground hidden md:table-cell">{formatCRC(item.precio_hora_dm)}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground hidden md:table-cell">{formatCRC(item.precio_hora_reparacion)}</td>
                            {isAdmin && (
                              <td className="py-2.5 px-4 text-right">
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-primary gap-1" onClick={() => startEdit(item)}>
                                  <Pencil size={12} /> Editar
                                </Button>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          {search ? "No se encontraron piezas con ese criterio" : "No hay piezas en el catálogo"}
        </div>
      )}
    </div>
  );
}