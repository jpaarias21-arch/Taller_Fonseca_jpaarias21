// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search, Wrench, Pencil, Lock, Upload, Download } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { formatColones } from "@/lib/utils";
import * as XLSX from "xlsx";

const CATEGORIAS = [
  "Carrocería",
  "Eléctrico",
  "Mecánica",
  "Farolería",
  "Accesorios",
  "Cristales-vidrios",
  "Motor",
  "Originales",
  "Usados",
  "Filtros",
];

const MARCAS = [
  "Toyota",
  "Nissan",
  "Hyundai",
  "Kia",
  "Honda",
  "Mazda",
  "Suzuki",
  "Mitsubishi",
  "Isuzu",
  "Subaru",
  "Chevrolet",
  "Ford",
  "Jeep",
  "Dodge",
  "RAM",
  "GMC",
  "Volkswagen",
  "Audi",
  "BMW",
  "Mercedes-Benz",
  "Porsche",
  "Renault",
  "Peugeot",
  "Citroen",
  "Fiat",
  "SEAT",
  "Skoda",
  "Volvo",
  "Land Rover",
  "Jaguar",
  "Lexus",
  "Acura",
  "Infiniti",
  "Mini",
  "Chery",
  "Geely",
  "BYD",
  "Great Wall",
  "JAC",
  "SsangYong",
  "Otro",
];

const TIPOS = ["Genericos", "Originales", "Usados", "Nuevos"];

const normalizeHeader = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES = {
  nombre: ["nombre", "pieza", "descripcion"],
  categoria: ["categoria", "categoria1"],
  marca: ["marca", "fabricante"],
  tipo: ["tipo", "condicion"],
  unidades: ["unidades", "unidad", "cantidad", "qty"],
  codigo: ["codigo", "cod", "codigointerno", "sku"],
  proveedor: ["proveedor"],
  costo: ["costo", "costounitario", "valorcosto"],
  precio: ["precio", "precioventa", "valorventa"],
};

const readExcelNumber = (value, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = String(value).replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pickCell = (row, aliases) => {
  const keys = Object.keys(row ?? {});
  for (const key of keys) {
    if (aliases.includes(normalizeHeader(key))) {
      return row[key];
    }
  }
  return undefined;
};

const mapExcelRowToPieza = (row) => {
  const nombre = String(pickCell(row, HEADER_ALIASES.nombre) ?? "").trim();
  if (!nombre) return null;

  const categoriaRaw = String(pickCell(row, HEADER_ALIASES.categoria) ?? "").trim();
  const categoria = categoriaRaw && CATEGORIAS.includes(categoriaRaw)
    ? categoriaRaw
    : CATEGORIAS[0];

  const marcaRaw = String(pickCell(row, HEADER_ALIASES.marca) ?? "").trim();
  const marca = marcaRaw && MARCAS.includes(marcaRaw)
    ? marcaRaw
    : MARCAS[0];

  const tipoRaw = String(pickCell(row, HEADER_ALIASES.tipo) ?? "").trim();
  const tipo = tipoRaw && TIPOS.includes(tipoRaw)
    ? tipoRaw
    : TIPOS[0];

  return {
    nombre,
    categoria,
    marca,
    tipo,
    unidades: Math.max(0, readExcelNumber(pickCell(row, HEADER_ALIASES.unidades), 0)),
    codigo: String(pickCell(row, HEADER_ALIASES.codigo) ?? "").trim(),
    proveedor: String(pickCell(row, HEADER_ALIASES.proveedor) ?? "").trim(),
    costo: Math.max(0, readExcelNumber(pickCell(row, HEADER_ALIASES.costo), 0)),
    precio: Math.max(0, readExcelNumber(pickCell(row, HEADER_ALIASES.precio), 0)),
  };
};

const normalizeImportErrorMessage = (errorLike) => {
  const message = String(errorLike?.message || errorLike || "Error desconocido").trim();
  const lower = message.toLowerCase();

  if (lower.includes("duplicate key") || lower.includes("unique constraint") || lower.includes("pieza_codigo_key")) {
    return "Código interno duplicado";
  }

  if (lower.includes("violates check constraint") || lower.includes("invalid input value for enum")) {
    return "Valor inválido en categoría, tipo o marca";
  }

  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("not allowed")) {
    return "Sin permisos para crear piezas";
  }

  if (lower.includes("null value") || lower.includes("not-null")) {
    return "Faltan campos obligatorios";
  }

  return message;
};

const buildImportFailureSummary = (messages = []) => {
  if (!messages.length) return "No se pudo determinar la causa.";

  const counts = new Map();
  messages.forEach((msg) => {
    counts.set(msg, (counts.get(msg) || 0) + 1);
  });

  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([msg, count]) => `${msg} (${count})`)
    .join("; ");

  return top;
};

const sanitizeCurrencyInput = (value) => String(value ?? "").replace(/[^\d]/g, "");

const formatCurrencyInput = (value) => {
  const sanitized = sanitizeCurrencyInput(value);
  if (!sanitized) return "";
  return formatColones(Number(sanitized), { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const buildPiezaForm = (data = {}) => {
  const safeData = data && typeof data === "object" ? data : {};
  return {
    ...safeData,
    nombre: safeData.nombre ?? "",
    categoria: safeData.categoria ?? "Carrocería",
    marca: safeData.marca ?? "Toyota",
    tipo: safeData.tipo ?? "Genericos",
    unidades: String(safeData.unidades ?? ""),
    codigo: safeData.codigo ?? "",
    proveedor: safeData.proveedor ?? "",
    costo: safeData.costo ?? "",
    precio: safeData.precio ?? "",
  };
};

function PiezaModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(buildPiezaForm(initial));
  useEffect(() => {
    setForm(buildPiezaForm(initial));
  }, [initial, open]);

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
            <label className="form-label">Marca *</label>
            <Select value={form.marca} onValueChange={v => setForm(f => ({ ...f, marca: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {MARCAS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label">Tipo *</label>
            <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label">Código Interno</label>
            <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="bg-secondary border-border" placeholder="P-001" />
          </div>
          <div>
            <label className="form-label">Proveedor</label>
            <Input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} className="bg-secondary border-border" placeholder="Ej: Repuestos del Valle" />
          </div>
          <div>
            <label className="form-label">Unidades</label>
            <Input
              type="number"
              min={0}
              value={form.unidades}
              onChange={e => setForm(f => ({ ...f, unidades: e.target.value }))}
              className="bg-secondary border-border"
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Costo (₡)</label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatCurrencyInput(form.costo)}
                onChange={e => setForm(f => ({ ...f, costo: sanitizeCurrencyInput(e.target.value) }))}
                className="bg-secondary border-border"
                placeholder="₡0"
              />
            </div>
            <div>
              <label className="form-label">Precio (₡)</label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatCurrencyInput(form.precio)}
                onChange={e => setForm(f => ({ ...f, precio: sanitizeCurrencyInput(e.target.value) }))}
                className="bg-secondary border-border"
                placeholder="₡0"
              />
            </div>
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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadPiezas = async () => {
      try {
        const data = await base44.entities.PiezaCatalogo.list();
        setPiezas(Array.isArray(data) ? data : []);
      } catch (error) {
        setPiezas([]);
        toast({
          title: "No se pudo cargar el catálogo",
          description: error?.message || "Intente nuevamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPiezas();
  }, []);

  const savePieza = async (form) => {
    const payload = {
      nombre: (form.nombre || "").trim(),
      categoria: form.categoria,
      marca: form.marca,
      tipo: form.tipo,
      unidades: Number(form.unidades || 0),
      codigo: (form.codigo || "").trim(),
      proveedor: (form.proveedor || "").trim(),
      costo: Number(sanitizeCurrencyInput(form.costo) || 0),
      precio: Number(sanitizeCurrencyInput(form.precio) || 0),
      ...(form.id ? { id: form.id } : {}),
    };

    if (!payload.nombre) {
      toast({
        title: "Nombre requerido",
        description: "Debe ingresar el nombre de la pieza.",
        variant: "destructive",
      });
      return;
    }

    if (payload.codigo) {
      const codigoExiste = piezas.some(
        (p) => p.id !== payload.id && (p.codigo || "").trim().toLowerCase() === payload.codigo.toLowerCase()
      );
      if (codigoExiste) {
        toast({
          title: "Código duplicado",
          description: "Ya existe una pieza con ese código interno.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      if (payload.id) {
        await base44.entities.PiezaCatalogo.update(payload.id, payload);
        setPiezas(prev => prev.map(p => p.id === payload.id ? { ...p, ...payload } : p));
        toast({ title: "Pieza actualizada" });
      } else {
        const nueva = await base44.entities.PiezaCatalogo.create(payload);
        setPiezas(prev => [...prev, nueva]);
        toast({ title: "Pieza creada en el catálogo" });
      }
      setFilterCat("todas");
      setModal(false);
      setEditPieza(null);
    } catch (error) {
      toast({
        title: "No se pudo guardar la pieza",
        description: error?.message || "Intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  const triggerImport = () => fileInputRef.current?.click();

  const handleExcelImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        toast({ title: "Archivo inválido", description: "No se encontró ninguna hoja en el archivo.", variant: "destructive" });
        return;
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
      if (!rows.length) {
        toast({ title: "Archivo vacío", description: "La hoja seleccionada no contiene registros.", variant: "destructive" });
        return;
      }

      const payload = rows.map(mapExcelRowToPieza).filter(Boolean);
      if (!payload.length) {
        toast({
          title: "Sin filas válidas",
          description: "No se encontraron piezas válidas. Verifica que exista una columna 'nombre' o 'pieza'.",
          variant: "destructive",
        });
        return;
      }

      const codigosEnUso = new Set(
        piezas
          .map((p) => String(p?.codigo ?? "").trim().toLowerCase())
          .filter(Boolean)
      );

      const payloadUnico = payload.filter((item) => {
        const codigo = String(item.codigo ?? "").trim().toLowerCase();
        if (!codigo) return true;
        if (codigosEnUso.has(codigo)) return false;
        codigosEnUso.add(codigo);
        return true;
      });

      if (!payloadUnico.length) {
        toast({
          title: "Sin registros para importar",
          description: "Todas las filas con código interno ya existen en el catálogo.",
          variant: "destructive",
        });
        return;
      }

      const results = await Promise.allSettled(payloadUnico.map((item) => base44.entities.PiezaCatalogo.create(item)));
      const success = results.filter((r) => r.status === "fulfilled");
      const failed = results.length - success.length;
      const failedMessages = results
        .filter((r) => r.status === "rejected")
        .map((r) => normalizeImportErrorMessage(r.reason));
      const failedSummary = buildImportFailureSummary(failedMessages);

      if (success.length) {
        const created = success.map((r) => r.value);
        setPiezas((prev) => [...prev, ...created]);
      }

      if (failed > 0) {
        console.error("Errores de importación de piezas:", failedMessages);
        toast({
          title: "Importación parcial",
          description: `Se importaron ${success.length} pieza(s) y ${failed} fallaron. Causa: ${failedSummary}`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Importación completada", description: `Se importaron ${success.length} pieza(s).` });
      }
      setFilterCat("todas");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al importar",
        description: "No se pudo procesar el archivo Excel. Verifica el formato e intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const searchLower = search.toLowerCase();

  const filtered = useMemo(() => {
    return piezas.filter((p) => {
      const nombre = String(p?.nombre ?? "").toLowerCase();
      const codigo = String(p?.codigo ?? "").toLowerCase();
      const match = nombre.includes(searchLower) || codigo.includes(searchLower);
      const matchCat = filterCat === "todas" || p.categoria === filterCat;
      return match && matchCat;
    });
  }, [piezas, searchLower, filterCat]);

  const categoriasVisibles = useMemo(() => {
    const extras = filtered
      .map((p) => p.categoria)
      .filter((cat) => cat && !CATEGORIAS.includes(cat));
    return [...CATEGORIAS, ...new Set(extras)];
  }, [filtered]);

  const grouped = useMemo(() => {
    return categoriasVisibles.reduce((acc, cat) => {
      const items = filtered.filter((p) => p.categoria === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    }, {});
  }, [filtered, categoriasVisibles]);

  const totalPiezas = useMemo(() => piezas.length, [piezas]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Catálogo de Piezas</h1>
          <p className="text-muted-foreground text-sm">
            Maestro estandarizado — {totalPiezas} piezas registradas
          </p>
        </div>
        {canManageCatalog ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelImport}
            />
            <Button
              asChild
              type="button"
              variant="outline"
              className="border-border font-semibold gap-2"
            >
              <a href="/plantilla-catalogo-piezas.xlsx" download>
                <Download size={16} /> Plantilla XLSX
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={triggerImport}
              disabled={importing}
              className="border-border font-semibold gap-2"
            >
              <Upload size={16} /> {importing ? "Importando..." : "Cargar Excel"}
            </Button>
            <Button onClick={() => { setEditPieza(null); setModal(true); }} className="bg-primary text-primary-foreground font-semibold gap-2">
              <Plus size={16} /> Nueva Pieza
            </Button>
          </div>
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
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border transition-colors bg-secondary/40 border-border">
                    <div>
                      <p className="text-sm font-medium">{p.nombre}</p>
                      {p.codigo && <p className="text-xs text-muted-foreground">{p.codigo}</p>}
                        {p.marca && <p className="text-xs text-muted-foreground/80">Marca: {p.marca}</p>}
                    </div>
                    {canManageCatalog && (
                      <div className="flex items-center gap-1">
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