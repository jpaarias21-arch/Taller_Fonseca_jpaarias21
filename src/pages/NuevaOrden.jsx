// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, Trash2, Search, AlertCircle, Camera, X } from "lucide-react";
import { Link } from "react-router-dom";

const MARCAS = ["Toyota","Honda","Hyundai","Kia","Nissan","Ford","Chevrolet","Mitsubishi","Mazda","Volkswagen","BMW","Mercedes-Benz","Audi","Suzuki","Subaru","Otro"];

function PiezaSelector({ piezas, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = piezas.filter(p => p.nombre.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar pieza del catálogo..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-9 bg-secondary border-border text-sm"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-secondary text-sm border-b border-border/50 last:border-0"
              onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
            >
              <p className="font-medium text-foreground">{p.nombre}</p>
              <p className="text-xs text-muted-foreground">{p.categoria}</p>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl p-4 text-center text-muted-foreground text-sm">
          No se encontró la pieza en el catálogo. <br />
          <span className="text-primary text-xs">Solo se permiten piezas del catálogo maestro.</span>
        </div>
      )}
    </div>
  );
}

export default function NuevaOrden() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [piezas, setPiezas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [placaSugerencias, setPlacaSugerencias] = useState([]);
  const [placaLoading, setPlacaLoading] = useState(false);

  const [form, setForm] = useState({
    placa: "", marca: "", modelo: "", anio: new Date().getFullYear(),
    color: "", codigo_pintura: "", kilometraje: "",
    cliente_nombre: "", cliente_telefono: "", cliente_cedula: "",
    lugar_procedencia: "", recomendado_por: "",
    evaluador_nombre: "", recibidor_nombre: "", enderezador_nombre: "",
    numero_predio: "",
    es_asegurado: false, aseguradora: "", numero_reclamo: "", monto_autorizado_seguro: "",
    adelanto_dinero: "", fecha_ingreso: new Date().toISOString().split("T")[0],
    descripcion_danos: "", notas_internas: "",
  });

  useEffect(() => {
    base44.entities.PiezaCatalogo.filter({ activo: true }).then(setPiezas);
  }, []);

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handlePlaca = async (raw) => {
    const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
    const formatted = clean.length > 3 ? clean.slice(0, 3) + "-" + clean.slice(3) : clean;
    updateForm("placa", formatted);

    if (clean.length >= 3) {
      setPlacaLoading(true);
      const resultados = await base44.entities.OrdenTrabajo.filter({ placa: formatted });
      setPlacaSugerencias(resultados);
      setPlacaLoading(false);
    } else {
      setPlacaSugerencias([]);
    }
  };

  const autocompletarDesdeOrden = (orden) => {
    setForm(f => ({
      ...f,
      marca: orden.marca || f.marca,
      modelo: orden.modelo || f.modelo,
      anio: orden.anio || f.anio,
      color: orden.color || f.color,
      codigo_pintura: orden.codigo_pintura || f.codigo_pintura,
      cliente_nombre: orden.cliente_nombre || f.cliente_nombre,
      cliente_telefono: orden.cliente_telefono || f.cliente_telefono,
      cliente_cedula: orden.cliente_cedula || f.cliente_cedula,
      lugar_procedencia: orden.lugar_procedencia || f.lugar_procedencia,
      recomendado_por: orden.recomendado_por || f.recomendado_por,
    }));
    setKmDisplay(orden.kilometraje ? Number(orden.kilometraje).toLocaleString("es-CR") : "");
    setPlacaSugerencias([]);
  };

  const handleTelefono = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 4 ? digits.slice(0, 4) + "-" + digits.slice(4) : digits;
    updateForm("cliente_telefono", formatted);
  };

  const handleCedula = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    let formatted = digits;
    if (digits.length > 5) formatted = digits.slice(0, 1) + "-" + digits.slice(1, 5) + "-" + digits.slice(5);
    else if (digits.length > 1) formatted = digits.slice(0, 1) + "-" + digits.slice(1);
    updateForm("cliente_cedula", formatted);
  };

  // Kilometraje con formato de puntos de miles
  const [kmDisplay, setKmDisplay] = useState(form.kilometraje ? Number(form.kilometraje).toLocaleString("es-CR") : "");

  const handleKilometraje = (raw) => {
    const digits = raw.replace(/\D/g, "");
    const num = digits ? parseInt(digits, 10) : "";
    updateForm("kilometraje", num === "" ? "" : num);
    setKmDisplay(num === "" ? "" : num.toLocaleString("es-CR"));
  };

  // Número de predio: permite alfanuméricos y guiones
  const handleNumeroPredio = (raw) => {
    const clean = raw.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
    updateForm("numero_predio", clean);
  };

  // Permite guiones y alfanuméricos para número de reclamo (e.g. SIN-2026-00001)
  const handleNumeroReclamo = (raw) => {
    const clean = raw.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
    updateForm("numero_reclamo", clean);
  };

  // Monto autorizado seguro: formato moneda con puntos de miles
  const [montoSeguroDisplay, setMontoSeguroDisplay] = useState(form.monto_autorizado_seguro ? Number(form.monto_autorizado_seguro).toLocaleString("es-CR") : "");

  const handleMontoSeguro = (raw) => {
    const digits = raw.replace(/\D/g, "");
    const num = digits ? parseInt(digits, 10) : "";
    updateForm("monto_autorizado_seguro", num === "" ? "" : num);
    setMontoSeguroDisplay(num === "" ? "" : num.toLocaleString("es-CR"));
  };

  // Formato moneda colones: guarda número limpio, muestra con puntos de miles
  const [adelantoDisplay, setAdelantoDisplay] = useState(form.adelanto_dinero ? Number(form.adelanto_dinero).toLocaleString("es-CR") : "");

  const handleAdelanto = (raw) => {
    const digits = raw.replace(/\D/g, "");
    const num = digits ? parseInt(digits, 10) : "";
    updateForm("adelanto_dinero", num === "" ? "" : num);
    setAdelantoDisplay(num === "" ? "" : num.toLocaleString("es-CR"));
  };

  const [lineasDisplay, setLineasDisplay] = useState([]); // display values for formatted fields

  const addLinea = (pieza) => {
    setLineas(prev => [...prev, {
      pieza_id: pieza.id,
      pieza_nombre: pieza.nombre,
      pieza_categoria: pieza.categoria,
      flag_desarmado_montaje: false,
      flag_reparacion: false,
      flag_pintura: false,
      tipo_repuesto: "Ninguno",
      descripcion_dano: "",
      horas_dm: 0, horas_reparacion: 0, costo_pintura: 0, costo_repuesto: 0,
    }]);
    setLineasDisplay(prev => [...prev, { costo_repuesto: "", costo_pintura: "" }]);
  };

  const updateLinea = (idx, key, val) => {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [key]: val } : l));
  };

  const updateLineaDisplay = (idx, key, val) => {
    setLineasDisplay(prev => prev.map((d, i) => i === idx ? { ...d, [key]: val } : d));
  };

  const handleCostoRepuesto = (idx, raw) => {
    const digits = raw.replace(/\D/g, "");
    const num = digits ? parseInt(digits, 10) : 0;
    updateLinea(idx, "costo_repuesto", num);
    updateLineaDisplay(idx, "costo_repuesto", digits ? num.toLocaleString("es-CR") : "");
  };

  const handleCostoPintura = (idx, raw) => {
    const digits = raw.replace(/\D/g, "");
    const num = digits ? parseInt(digits, 10) : 0;
    updateLinea(idx, "costo_pintura", num);
    updateLineaDisplay(idx, "costo_pintura", digits ? num.toLocaleString("es-CR") : "");
  };

  const removeLinea = (idx) => {
    setLineas(prev => prev.filter((_, i) => i !== idx));
    setLineasDisplay(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFotos(prev => [...prev, file_url]);
    }
  };

  const validateAndSave = async () => {
    setSubmitted(true);
    // Validate required fields
    if (!form.placa || !form.marca || !form.modelo || !form.cliente_nombre || !form.cliente_telefono) {
      toast({ title: "Campos requeridos", description: "Complete los datos del vehículo y cliente.", variant: "destructive" });
      return;
    }
    if (!form.fecha_ingreso) {
      toast({ title: "Fecha requerida", description: "Ingrese la fecha de ingreso.", variant: "destructive" });
      return;
    }
    // Validate lineas: tipo Nuevo o UTS requiere descripcion_dano
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      if ((l.tipo_repuesto === "Nuevo" || l.tipo_repuesto === "UTS") && !l.descripcion_dano?.trim()) {
        toast({
          title: "Descripción técnica requerida",
          description: `La pieza "${l.pieza_nombre}" tiene tipo Nuevo/UTS. Debe ingresar la justificación técnica del daño.`,
          variant: "destructive"
        });
        return;
      }
    }

    setSaving(true);
    const numeroOrden = `OT-${Date.now().toString().slice(-6)}`;

    try {
      const ordenData = {
        ...form,
        numero_orden: numeroOrden,
        kilometraje: Number(form.kilometraje) || 0,
        anio: Number(form.anio),
        monto_autorizado_seguro: Number(form.monto_autorizado_seguro) || 0,
        adelanto_dinero: Number(form.adelanto_dinero) || 0,
        fotos,
        estado_cotizacion: "Borrador",
        estado_kanban: "Recepción",
        historial_kanban: [{ estacion: "Recepción", fecha: new Date().toISOString(), tecnico: form.evaluador_nombre || "Sistema" }],
      };

      const orden = await base44.entities.OrdenTrabajo.create(ordenData);

      const lineResults = await Promise.allSettled(
        lineas.map((linea) => {
          const subtotal =
            linea.horas_dm * 15 +
            linea.horas_reparacion * 20 +
            (linea.costo_pintura || 0) +
            (linea.costo_repuesto || 0);

          return base44.entities.LineaAvaluo.create({
            ...linea,
            orden_id: orden.id,
            subtotal,
            es_ampliacion: false,
          });
        })
      );

      const failedLines = lineResults.filter((result) => result.status === "rejected");

      if (failedLines.length > 0) {
        console.error("Error creando lineas de avaluo:", failedLines);
        toast({
          title: "Orden creada con advertencias",
          description: `${numeroOrden} se guardó, pero ${failedLines.length} línea(s) no pudieron registrarse.`,
          variant: "destructive"
        });
      } else {
        toast({ title: "Orden creada", description: `${numeroOrden} registrada exitosamente.` });
      }

      navigate(`/ordenes/${orden.id}`);
    } catch (error) {
      console.error("Error guardando orden:", error);
      toast({
        title: "No se pudo guardar la orden",
        description: error instanceof Error ? error.message : "Ocurrió un problema al guardar la orden.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/ordenes">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft size={16} /> Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Nueva Orden de Trabajo</h1>
          <p className="text-muted-foreground text-sm">Ingreso de vehículo y avalúo técnico</p>
        </div>
      </div>

      {/* Section 1: Vehicle data */}
      <div className="data-card space-y-4">
        <h2 className="font-heading font-bold text-lg uppercase tracking-wide text-primary border-b border-border pb-2">
          1. Datos del Vehículo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="relative">
            <label className="form-label">Placa *</label>
            <div className="relative">
              <Input value={form.placa} onChange={e => handlePlaca(e.target.value)} placeholder="ABC-1234" className="bg-secondary border-border uppercase" />
              {placaLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {placaSugerencias.length > 0 && (
              <div className="absolute z-50 w-72 mt-1 bg-card border border-primary/50 rounded-lg shadow-xl overflow-hidden">
                <div className="px-3 py-1.5 bg-primary/10 border-b border-border text-xs font-semibold text-primary uppercase tracking-wide">
                  Vehículo encontrado — clic para autocompletar
                </div>
                {placaSugerencias.slice(0, 3).map(orden => (
                  <button
                    key={orden.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-secondary border-b border-border/50 last:border-0 transition-colors"
                    onClick={() => autocompletarDesdeOrden(orden)}
                  >
                    <p className="font-semibold text-sm text-foreground">{orden.placa} — {orden.marca} {orden.modelo} {orden.anio}</p>
                    <p className="text-xs text-muted-foreground">{orden.cliente_nombre} · {orden.cliente_telefono}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="form-label">Marca *</label>
            <Select value={form.marca} onValueChange={v => updateForm("marca", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {MARCAS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label">Modelo *</label>
            <Input value={form.modelo} onChange={e => updateForm("modelo", e.target.value)} placeholder="Corolla" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Año *</label>
            <Input type="number" value={form.anio} onChange={e => updateForm("anio", e.target.value)} min={1980} max={new Date().getFullYear() + 1} className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Color</label>
            <Input value={form.color} onChange={e => updateForm("color", e.target.value)} placeholder="Blanco" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Código de Pintura</label>
            <Input value={form.codigo_pintura} onChange={e => updateForm("codigo_pintura", e.target.value)} placeholder="040" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Kilometraje *</label>
            <Input value={kmDisplay} onChange={e => handleKilometraje(e.target.value)} placeholder="0" inputMode="numeric" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Número de Predio</label>
            <Select value={form.numero_predio} onValueChange={v => updateForm("numero_predio", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="P-01">P-01</SelectItem>
                <SelectItem value="P-02">P-02</SelectItem>
                <SelectItem value="P-03">P-03</SelectItem>
                <SelectItem value="P-04">P-04</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section 2: Client data */}
      <div className="data-card space-y-4">
        <h2 className="font-heading font-bold text-lg uppercase tracking-wide text-primary border-b border-border pb-2">
          2. Datos del Cliente
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Nombre Completo *</label>
            <Input value={form.cliente_nombre} onChange={e => updateForm("cliente_nombre", e.target.value)} placeholder="Juan Pérez" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Teléfono *</label>
            <Input value={form.cliente_telefono} onChange={e => handleTelefono(e.target.value)} placeholder="7000-0000" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Cédula / DUI</label>
            <Input value={form.cliente_cedula} onChange={e => handleCedula(e.target.value)} placeholder="1-0000-0000" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Lugar de Procedencia</label>
            <Input value={form.lugar_procedencia} onChange={e => updateForm("lugar_procedencia", e.target.value)} placeholder="Santa Ana" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Recomendado Por</label>
            <Input value={form.recomendado_por} onChange={e => updateForm("recomendado_por", e.target.value)} placeholder="Carlos García" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Fecha de Ingreso *</label>
            <Input type="date" value={form.fecha_ingreso} onChange={e => updateForm("fecha_ingreso", e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>
      </div>

      {/* Section 3: Personnel */}
      <div className="data-card space-y-4">
        <h2 className="font-heading font-bold text-lg uppercase tracking-wide text-primary border-b border-border pb-2">
          3. Personal del Taller
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Evaluador / Recepcionista</label>
            <Input value={form.evaluador_nombre} onChange={e => updateForm("evaluador_nombre", e.target.value)} placeholder="Nombre del evaluador" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Recibidor</label>
            <Input value={form.recibidor_nombre} onChange={e => updateForm("recibidor_nombre", e.target.value)} placeholder="Nombre del recibidor" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="form-label">Enderezador</label>
            <Input value={form.enderezador_nombre} onChange={e => updateForm("enderezador_nombre", e.target.value)} placeholder="Nombre del enderezador" className="bg-secondary border-border" />
          </div>
        </div>
      </div>

      {/* Section 4: Insurance */}
      <div className="data-card space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="font-heading font-bold text-lg uppercase tracking-wide text-primary">
            4. Seguro
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">¿Es asegurado?</span>
            <Switch checked={form.es_asegurado} onCheckedChange={v => updateForm("es_asegurado", v)} />
          </div>
        </div>
        {form.es_asegurado && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <label className="form-label">Aseguradora</label>
              <Input
                value={form.aseguradora}
                onChange={e => updateForm("aseguradora", e.target.value)}
                placeholder="Buscar aseguradora..."
                className="bg-secondary border-border"
                list="aseguradoras-list"
              />
              <datalist id="aseguradoras-list">
                <option value="INS (Instituto Nacional de Seguros)" />
                <option value="SISA" />
                <option value="Mapfre Costa Rica" />
                <option value="Qualitas" />
                <option value="Allianz" />
                <option value="Pan American Life" />
                <option value="Oceánica de Seguros" />
                <option value="ASSA Compañía de Seguros" />
                <option value="Sagicor" />
                <option value="Lafise Seguros" />
              </datalist>
            </div>
            <div>
              <label className="form-label">Número de Reclamo</label>
              <Input value={form.numero_reclamo} onChange={e => handleNumeroReclamo(e.target.value)} placeholder="SIN-2026-00001" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="form-label">Monto Autorizado (₡)</label>
              <Input value={montoSeguroDisplay} onChange={e => handleMontoSeguro(e.target.value)} placeholder="0" inputMode="numeric" className="bg-secondary border-border" />
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Adelanto de Dinero (₡)</label>
            <Input value={adelantoDisplay} onChange={e => handleAdelanto(e.target.value)} placeholder="0" className="bg-secondary border-border" inputMode="numeric" />
          </div>
        </div>
      </div>

      {/* Section 5: Photos */}
      <div className="data-card space-y-4">
        <h2 className="font-heading font-bold text-lg uppercase tracking-wide text-primary border-b border-border pb-2">
          5. Fotos del Vehículo
        </h2>
        <div className="flex flex-wrap gap-3">
          {fotos.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt={`Foto ${i+1}`} className="w-24 h-24 object-cover rounded-lg border border-border" />
              <button type="button" onClick={() => setFotos(f => f.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs">
                <X size={10} />
              </button>
            </div>
          ))}
          <label className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <Camera size={20} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground mt-1">Agregar</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} />
          </label>
        </div>
      </div>

      {/* Section 6: Damage lines */}
      <div className="data-card space-y-4">
        <h2 className="font-heading font-bold text-lg uppercase tracking-wide text-primary border-b border-border pb-2">
          6. Líneas de Daño (Avalúo)
        </h2>

        <PiezaSelector piezas={piezas} onSelect={addLinea} />

        {lineas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            Busque y seleccione piezas del catálogo para agregar líneas de daño
          </div>
        )}

        <div className="space-y-3">
          {lineas.map((linea, idx) => (
            <div key={idx} className="bg-secondary/50 border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{linea.pieza_nombre}</p>
                  <p className="text-xs text-muted-foreground">{linea.pieza_categoria}</p>
                </div>
                <button type="button" onClick={() => removeLinea(idx)} className="text-destructive hover:text-destructive/80 p-1">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-4">
                {[
                  { key: "flag_desarmado_montaje", label: "D&M" },
                  { key: "flag_reparacion", label: "Reparación" },
                  { key: "flag_pintura", label: "Pintura" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linea[key]}
                      onChange={e => updateLinea(idx, key, e.target.checked)}
                      className="w-4 h-4 accent-yellow-400"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Repuesto:</span>
                  <Select value={linea.tipo_repuesto} onValueChange={v => updateLinea(idx, "tipo_repuesto", v)}>
                    <SelectTrigger className="h-8 bg-card border-border text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="Ninguno">Ninguno</SelectItem>
                      <SelectItem value="Nuevo">Nuevo</SelectItem>
                      <SelectItem value="Reparación">Reparación</SelectItem>
                      <SelectItem value="UTS">UTS/Usado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Costos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {linea.flag_desarmado_montaje && (
                  <div>
                    <label className="form-label">Hrs D&M</label>
                    <Input type="number" min={0} value={linea.horas_dm} onChange={e => updateLinea(idx, "horas_dm", Number(e.target.value))} className="bg-card border-border h-8 text-sm" />
                  </div>
                )}
                {linea.flag_reparacion && (
                  <div>
                    <label className="form-label">Hrs Rep.</label>
                    <Input type="number" min={0} value={linea.horas_reparacion} onChange={e => updateLinea(idx, "horas_reparacion", Number(e.target.value))} className="bg-card border-border h-8 text-sm" />
                  </div>
                )}
                {linea.flag_pintura && (
                  <div>
                    <label className="form-label">Costo Pintura (₡)</label>
                    <Input
                      value={lineasDisplay[idx]?.costo_pintura ?? ""}
                      onChange={e => handleCostoPintura(idx, e.target.value)}
                      placeholder="0"
                      inputMode="numeric"
                      className="bg-card border-border h-8 text-sm"
                    />
                  </div>
                )}
                {(linea.tipo_repuesto === "Nuevo" || linea.tipo_repuesto === "UTS") && (
                  <div>
                    <label className="form-label">Costo Repuesto (₡)</label>
                    <Input
                      value={lineasDisplay[idx]?.costo_repuesto ?? ""}
                      onChange={e => handleCostoRepuesto(idx, e.target.value)}
                      placeholder="0"
                      inputMode="numeric"
                      className="bg-card border-border h-8 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Description — required for Nuevo/UTS */}
              {(linea.tipo_repuesto === "Nuevo" || linea.tipo_repuesto === "UTS") && (
                <div>
                  <label className="form-label flex items-center gap-1">
                    <AlertCircle size={12} className="text-destructive" />
                    Descripción Técnica del Daño * (Obligatorio para Nuevo/UTS)
                  </label>
                  <Textarea
                    value={linea.descripcion_dano}
                    onChange={e => updateLinea(idx, "descripcion_dano", e.target.value)}
                    placeholder="Justifique técnicamente por qué la pieza está inservible o requiere reemplazo..."
                    className={`bg-card border-border text-sm ${submitted && !linea.descripcion_dano ? "border-destructive" : ""}`}
                    rows={2}
                  />
                  {submitted && !linea.descripcion_dano && (
                    <p className="text-destructive text-xs mt-1">Este campo es obligatorio</p>
                  )}
                </div>
              )}

              {(linea.tipo_repuesto === "Ninguno" || linea.tipo_repuesto === "Reparación") && (
                <div>
                  <label className="form-label">Observaciones</label>
                  <Input value={linea.descripcion_dano} onChange={e => updateLinea(idx, "descripcion_dano", e.target.value)} placeholder="Observaciones opcionales..." className="bg-card border-border text-sm" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 7: Notes */}
      <div className="data-card space-y-4">
        <h2 className="font-heading font-bold text-lg uppercase tracking-wide text-primary border-b border-border pb-2">
          7. Observaciones
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Descripción General de Daños</label>
            <Textarea value={form.descripcion_danos} onChange={e => updateForm("descripcion_danos", e.target.value)} placeholder="Descripción general..." className="bg-secondary border-border" rows={3} />
          </div>
          <div>
            <label className="form-label">Notas Internas</label>
            <Textarea value={form.notas_internas} onChange={e => updateForm("notas_internas", e.target.value)} placeholder="Notas solo para el taller..." className="bg-secondary border-border" rows={3} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Link to="/ordenes">
          <Button variant="outline" className="border-border w-full sm:w-auto">Cancelar</Button>
        </Link>
        <Button onClick={validateAndSave} disabled={saving} className="bg-primary text-primary-foreground font-semibold w-full sm:w-auto gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
          {saving ? "Guardando..." : "Crear Orden de Trabajo"}
        </Button>
      </div>
    </div>
  );
}