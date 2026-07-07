// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { OrdenTrabajoAPI } from "@/api/OrdenTrabajo";
import { WhatsAppAPI } from "@/api/WhatsApp";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusChangeWhatsappModal } from "@/components/StatusChangeWhatsappModal";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft, Car, User, Shield, Phone, MapPin, Calendar,
  CheckCircle, Clock, AlertTriangle, Camera, ChevronRight,
  Package, Wrench, DollarSign, FileText, History, Lock
} from "lucide-react";
import { useRole } from "@/lib/useRole";
import { formatColones, formatDisplayDateTime } from "@/lib/utils";
import { buildStatusWhatsAppMessage, normalizeWhatsAppPhone } from "@/lib/whatsapp";

const ESTADO_COT_COLORS = {
  "Borrador": "bg-secondary text-muted-foreground border-border",
  "Enviado": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Aprobado": "bg-green-500/20 text-green-400 border-green-500/30",
  "Autorizado por Seguro": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Ampliación": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const KANBAN_STATIONS = [
  "Recepción", "Espera de Autorización", "Desarmado", "Enderezado",
  "Preparación", "Cabina de Pintura", "Armado", "Pulido",
  "Control de Calidad", "Entregado"
];

const OPERATIVE_STATIONS = ["Desarmado", "Enderezado", "Preparación", "Cabina de Pintura", "Armado", "Pulido", "Control de Calidad", "Entregado"];

const normalizePhotoEntry = (value) => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    return String(value.file_url || value.url || value.path || "").trim();
  }
  return "";
};

const extractUploadsPath = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("uploads/")) return raw.slice("uploads/".length);

  try {
    const parsed = new URL(raw);
    const marker = "/uploads/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx >= 0) return parsed.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }

  return null;
};

export default function OrdenDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canApproveQuote, canMoveKanban, canCreateOrder } = useRole();
  const [orden, setOrden] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("info");
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [fotosView, setFotosView] = useState([]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingWhatsappStatus, setPendingWhatsappStatus] = useState("");
  const [pendingWhatsappMessage, setPendingWhatsappMessage] = useState("");
  const [pendingKanbanHistorial, setPendingKanbanHistorial] = useState([]);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [ords, lins, reqs] = await Promise.all([
        base44.entities.OrdenTrabajo.list("-created_date", 200).then(all => all.filter(o => o.id === id)),
        base44.entities.LineaAvaluo.list("-created_date", 200).then(all => all.filter(l => l.orden_id === id)),
        base44.entities.RequerimientoCompra.list("-created_date", 200).then(all => all.filter(r => r.orden_id === id)),
      ]);
      setOrden(ords[0] || null);
      setLineas(lins);
      setCompras(reqs);
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const resolveFotos = async () => {
      const rawFotos = Array.isArray(orden?.fotos) ? orden.fotos : [];
      const resolved = await Promise.all(
        rawFotos.map(async (entry, i) => {
          const raw = normalizePhotoEntry(entry);
          if (!raw || raw.startsWith("blob:")) {
            return { id: `${i}-invalid`, url: null };
          }

          if (raw.startsWith("data:image/")) {
            return { id: `${i}-data`, url: raw };
          }

          const path = extractUploadsPath(raw);
          if (!path) {
            return { id: `${i}-url`, url: raw };
          }

          const signed = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60 * 24 * 7);
          if (signed.data?.signedUrl) {
            return { id: `${i}-signed`, url: signed.data.signedUrl };
          }

          const pub = supabase.storage.from("uploads").getPublicUrl(path);
          return { id: `${i}-pub`, url: pub.data?.publicUrl || raw };
        })
      );

      if (!cancelled) setFotosView(resolved);
    };

    resolveFotos();
    return () => {
      cancelled = true;
    };
  }, [orden?.fotos]);

  const handleEstadoCotizacion = async (nuevoEstado) => {
    setUpdatingEstado(true);
    const aprobado = nuevoEstado === "Aprobado" || nuevoEstado === "Autorizado por Seguro";

    await base44.entities.OrdenTrabajo.update(id, { estado_cotizacion: nuevoEstado });

    // Auto-generate purchase requirements when approved
    if (aprobado) {
      const lineasParaCompra = lineas.filter(l => l.tipo_repuesto === "Nuevo" || l.tipo_repuesto === "UTS");
      for (const linea of lineasParaCompra) {
        // Check if already exists
        const existe = compras.find(c => c.linea_avaluo_id === linea.id);
        if (!existe) {
          await base44.entities.RequerimientoCompra.create({
            orden_id: id,
            numero_orden: orden.numero_orden,
            linea_avaluo_id: linea.id,
            pieza_nombre: linea.pieza_nombre,
            descripcion_dano: linea.descripcion_dano,
            tipo_repuesto: linea.tipo_repuesto,
            cantidad: 1,
            estado: "Pendiente",
          });
        }
      }
      toast({ title: "Cotización aprobada", description: `Se generaron ${lineasParaCompra.length} requerimientos de compra automáticamente.` });
    }

    setOrden(prev => ({ ...prev, estado_cotizacion: nuevoEstado }));
    setUpdatingEstado(false);

    // Reload compras
    const reqs = await base44.entities.RequerimientoCompra.filter({ orden_id: id });
    setCompras(reqs);
  };

  const handleEstadoKanban = async (nuevaEstacion) => {
    if (nuevaEstacion === orden.estado_kanban) return;

    const aprobado = orden.estado_cotizacion === "Aprobado" || orden.estado_cotizacion === "Autorizado por Seguro";
    if (OPERATIVE_STATIONS.includes(nuevaEstacion) && !aprobado) {
      toast({
        title: "Movimiento bloqueado",
        description: "El vehículo no puede avanzar a etapas operativas sin una cotización Aprobada o Autorizada por Seguro.",
        variant: "destructive"
      });
      return;
    }

    if (!normalizeWhatsAppPhone(orden?.cliente_telefono)) {
      toast({
        title: "Movimiento bloqueado",
        description: "No se puede confirmar el cambio porque falta teléfono válido del cliente para WhatsApp.",
        variant: "destructive"
      });
      return;
    }

    const historial = [...(orden.historial_kanban || []), {
      estacion: nuevaEstacion,
      fecha: new Date().toISOString(),
      tecnico: orden.tecnico_actual_nombre || "Sistema"
    }];

    setPendingWhatsappStatus(nuevaEstacion);
    setPendingWhatsappMessage(buildStatusWhatsAppMessage(orden, nuevaEstacion));
    setPendingKanbanHistorial(historial);
    setStatusModalOpen(true);
  };

  const sendMessageAutomatically = async () => {
    const phone = normalizeWhatsAppPhone(orden?.cliente_telefono);
    if (!phone) {
      toast({
        title: "No se pudo enviar",
        description: "Falta teléfono del cliente.",
        variant: "destructive"
      });
      return;
    }

    if (!pendingWhatsappStatus) {
      toast({
        title: "No se pudo confirmar",
        description: "No hay un nuevo estatus seleccionado.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingWhatsapp(true);

      let updatedOrder = null;
      try {
        updatedOrder = await OrdenTrabajoAPI.actualizarEstatusKanbanConHistorial(id, pendingWhatsappStatus, pendingKanbanHistorial);
      } catch {
        updatedOrder = await base44.entities.OrdenTrabajo.update(id, {
          estado_kanban: pendingWhatsappStatus,
          historial_kanban: pendingKanbanHistorial
        });
      }

      setOrden(prev => ({
        ...prev,
        ...updatedOrder,
        estado_kanban: pendingWhatsappStatus,
        historial_kanban: pendingKanbanHistorial
      }));

      try {
        await WhatsAppAPI.enviarEstatus({
          to: phone,
          message: pendingWhatsappMessage,
          mode: "text",
          provider: "meta",
          order_id: orden?.id,
          estado: pendingWhatsappStatus,
          placa: orden?.placa,
          cliente: orden?.cliente_nombre
        });

        toast({
          title: "Estatus actualizado",
          description: "El estado se actualizó y el cliente fue notificado automáticamente por WhatsApp."
        });
      } catch (error) {
        toast({
          title: "Estatus actualizado con aviso",
          description: `Se actualizó el estado, pero no se pudo enviar WhatsApp: ${error?.message || "Error no identificado."}`,
          variant: "destructive"
        });
      }

      setStatusModalOpen(false);
      setPendingWhatsappStatus("");
      setPendingWhatsappMessage("");
      setPendingKanbanHistorial([]);
    } catch (error) {
      toast({
        title: "Error al confirmar el cambio",
        description: error?.message || "No fue posible actualizar el estado.",
        variant: "destructive"
      });
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const totalCotizado = lineas.reduce((sum, l) => sum + (l.subtotal || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Orden no encontrada</p>
        <Link to="/ordenes"><Button className="mt-4">Volver</Button></Link>
      </div>
    );
  }

  const TABS = [
    { id: "info", label: "Información", IconComp: Car },
    { id: "avaluo", label: "Avalúo", IconComp: Wrench },
    { id: "compras", label: `Compras (${compras.length})`, IconComp: Package },
    { id: "fotos", label: `Fotos (${orden.fotos?.length || 0})`, IconComp: Camera },
    { id: "historial", label: "Historial", IconComp: History },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link to="/ordenes">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft size={16} /> Órdenes
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-heading font-bold uppercase">{orden.placa}</h1>
            <span className={`station-badge border text-sm ${ESTADO_COT_COLORS[orden.estado_cotizacion]}`}>
              {orden.estado_cotizacion}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{orden.numero_orden} · {orden.marca} {orden.modelo} {orden.anio} · {orden.cliente_nombre}</p>
        </div>
      </div>

      {/* Status controls */}
      <div className="data-card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase flex items-center gap-1">
                Estado Cotización {!canApproveQuote && <Lock size={11} className="text-muted-foreground" />}
              </p>
              {canApproveQuote ? (
                <Select value={orden.estado_cotizacion} onValueChange={handleEstadoCotizacion} disabled={updatingEstado}>
                  <SelectTrigger className="w-52 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="Borrador">Borrador</SelectItem>
                    <SelectItem value="Enviado">Enviado</SelectItem>
                    <SelectItem value="Aprobado">Aprobado</SelectItem>
                    <SelectItem value="Autorizado por Seguro">Autorizado por Seguro</SelectItem>
                    <SelectItem value="Ampliación">Ampliación</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-52 h-9 flex items-center px-3 bg-secondary/50 border border-border rounded-md text-sm text-muted-foreground">
                  {orden.estado_cotizacion}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase flex items-center gap-1">
                Estación Kanban {!canMoveKanban && <Lock size={11} className="text-muted-foreground" />}
              </p>
              {canMoveKanban ? (
                <Select value={orden.estado_kanban} onValueChange={handleEstadoKanban}>
                  <SelectTrigger className="w-52 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {KANBAN_STATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-52 h-9 flex items-center px-3 bg-secondary/50 border border-border rounded-md text-sm text-muted-foreground">
                  {orden.estado_kanban}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Total Cotizado</p>
            <p className="text-2xl font-heading font-bold text-primary">{formatColones(totalCotizado, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
        </div>
        {(orden.estado_cotizacion === "Borrador" || orden.estado_cotizacion === "Enviado") && (
          <div className="mt-3 flex items-center gap-2 text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-2">
            <AlertTriangle size={14} />
            El vehículo no puede avanzar a etapas operativas hasta que la cotización sea Aprobada.
          </div>
        )}
      </div>

      <StatusChangeWhatsappModal
        open={statusModalOpen}
        onOpenChange={(open) => {
          setStatusModalOpen(open);
          if (!open && !sendingWhatsapp) {
            setPendingWhatsappStatus("");
            setPendingWhatsappMessage("");
            setPendingKanbanHistorial([]);
          }
        }}
        stage={pendingWhatsappStatus}
        message={pendingWhatsappMessage}
        onMessageChange={setPendingWhatsappMessage}
        onConfirm={sendMessageAutomatically}
        isSubmitting={sendingWhatsapp}
        disableConfirm={!pendingWhatsappStatus || !pendingWhatsappMessage?.trim()}
      />

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border gap-1 pb-0">
        {TABS.map(({ id: tabId, label, IconComp }) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === tabId
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconComp size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vehicle */}
          <div className="data-card space-y-3">
            <h3 className="font-heading font-bold uppercase tracking-wide flex items-center gap-2">
              <Car size={16} className="text-primary" /> Vehículo
            </h3>
            {[["Placa", orden.placa], ["Marca / Modelo", `${orden.marca} ${orden.modelo}`], ["Año", String(orden.anio)], ["Color", orden.color], ["Código Pintura", orden.codigo_pintura], ["Kilometraje", orden.kilometraje ? `${orden.kilometraje.toLocaleString()} km` : null], ["N° Predio", orden.numero_predio]].map(item => item[1] ? (
              <div key={item[0]} className="flex justify-between text-sm border-b border-border/40 pb-2">
                <span className="text-muted-foreground">{item[0]}</span>
                <span className="font-medium text-right">{item[1]}</span>
              </div>
            ) : null)}
          </div>

          {/* Client */}
          <div className="data-card space-y-3">
            <h3 className="font-heading font-bold uppercase tracking-wide flex items-center gap-2">
              <User size={16} className="text-primary" /> Cliente
            </h3>
            {[["Nombre", orden.cliente_nombre], ["Teléfono", orden.cliente_telefono], ["Cédula", orden.cliente_cedula], ["Procedencia", orden.lugar_procedencia], ["Recomendado por", orden.recomendado_por], ["Fecha Ingreso", formatDisplayDateTime(orden.fecha_ingreso)]].map(item => item[1] ? (
              <div key={item[0]} className="flex justify-between text-sm border-b border-border/40 pb-2">
                <span className="text-muted-foreground">{item[0]}</span>
                <span className="font-medium text-right">{item[1]}</span>
              </div>
            ) : null)}
          </div>

          {/* Personnel */}
          <div className="data-card space-y-3">
            <h3 className="font-heading font-bold uppercase tracking-wide flex items-center gap-2">
              <Wrench size={16} className="text-primary" /> Personal
            </h3>
            {[["Evaluador", orden.evaluador_nombre], ["Recibidor", orden.recibidor_nombre], ["Enderezador", orden.enderezador_nombre]].map(item => item[1] ? (
              <div key={item[0]} className="flex justify-between text-sm border-b border-border/40 pb-2">
                <span className="text-muted-foreground">{item[0]}</span>
                <span className="font-medium">{item[1]}</span>
              </div>
            ) : null)}
          </div>

          {/* Insurance / Financial */}
          <div className="data-card space-y-3">
            <h3 className="font-heading font-bold uppercase tracking-wide flex items-center gap-2">
              <Shield size={16} className="text-primary" /> Seguro y Financiero
            </h3>
            <div className="flex justify-between text-sm border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Tipo</span>
              <span className={`font-semibold ${orden.es_asegurado ? "text-primary" : "text-muted-foreground"}`}>
                {orden.es_asegurado ? "Asegurado" : "Particular"}
              </span>
            </div>
            {orden.es_asegurado && (
              <>
                {[["Aseguradora", orden.aseguradora], ["Monto Autorizado", orden.monto_autorizado_seguro ? formatColones(orden.monto_autorizado_seguro, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : null]].map(item => item[1] ? (
                  <div key={item[0]} className="flex justify-between text-sm border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">{item[0]}</span>
                    <span className="font-medium">{item[1]}</span>
                  </div>
                ) : null)}
                <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2 gap-4">
                  <span className="text-muted-foreground whitespace-nowrap">N° Reclamo</span>
                  <Input
                    value={orden.numero_reclamo || ""}
                    onChange={e => {
                      const clean = e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
                      setOrden(prev => ({ ...prev, numero_reclamo: clean }));
                    }}
                    onBlur={async () => {
                      await base44.entities.OrdenTrabajo.update(id, { numero_reclamo: orden.numero_reclamo });
                    }}
                    placeholder="SIN-2026-00001"
                    className="bg-secondary border-border h-7 text-sm text-right w-44"
                  />
                </div>
              </>
            )}
            <div className="flex justify-between text-sm border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Adelanto</span>
              <span className="font-medium text-green-400">{formatColones(orden.adelanto_dinero || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Cotizado</span>
              <span className="font-bold text-primary">{formatColones(totalCotizado, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Avalúo */}
      {tab === "avaluo" && (
        <div className="data-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Pieza</th>
                  <th className="text-center py-3 px-3 text-muted-foreground font-semibold text-xs uppercase">D&M</th>
                  <th className="text-center py-3 px-3 text-muted-foreground font-semibold text-xs uppercase">Rep.</th>
                  <th className="text-center py-3 px-3 text-muted-foreground font-semibold text-xs uppercase">Pint.</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Repuesto</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase hidden lg:table-cell">Descripción</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map(l => (
                  <tr key={l.id} className={`border-b border-border/50 ${l.es_ampliacion ? "bg-purple-500/5" : ""}`}>
                    <td className="py-3 px-4">
                      <p className="font-medium">{l.pieza_nombre}</p>
                      <p className="text-xs text-muted-foreground">{l.pieza_categoria}</p>
                      {l.es_ampliacion && <span className="text-xs text-purple-400 font-semibold">AMPLIACIÓN</span>}
                    </td>
                    <td className="py-3 px-3 text-center">{l.flag_desarmado_montaje ? "✓" : "—"}</td>
                    <td className="py-3 px-3 text-center">{l.flag_reparacion ? "✓" : "—"}</td>
                    <td className="py-3 px-3 text-center">{l.flag_pintura ? "✓" : "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`station-badge border text-xs ${
                        l.tipo_repuesto === "Nuevo" ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        : l.tipo_repuesto === "UTS" ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : l.tipo_repuesto === "Reparación" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-secondary text-muted-foreground border-border"
                      }`}>
                        {l.tipo_repuesto}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate">
                      {l.descripcion_dano || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-primary">{formatColones(l.subtotal || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
                {lineas.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No hay líneas de daño registradas</td></tr>
                )}
              </tbody>
              {lineas.length > 0 && (
                <tfoot>
                  <tr className="bg-secondary/30 border-t border-border">
                    <td colSpan={6} className="py-3 px-4 text-right font-bold uppercase text-sm">Total</td>
                    <td className="py-3 px-4 text-right font-bold text-primary text-lg">{formatColones(totalCotizado, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Tab: Compras */}
      {tab === "compras" && (
        <div className="data-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Pieza</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Tipo</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase">Estado</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold text-xs uppercase hidden md:table-cell">Descripción del Daño</th>
                </tr>
              </thead>
              <tbody>
                {compras.map(c => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">{c.pieza_nombre}</td>
                    <td className="py-3 px-4">
                      <span className="station-badge bg-orange-500/20 text-orange-400 border border-orange-500/30">{c.tipo_repuesto}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`station-badge border ${
                        c.estado === "Recibido" ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : c.estado === "Ordenado" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : c.estado === "Cancelado" ? "bg-destructive/20 text-red-400 border-destructive/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }`}>{c.estado}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">{c.descripcion_dano || "—"}</td>
                  </tr>
                ))}
                {compras.length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No hay requerimientos de compra. Se generan al aprobar la cotización.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Fotos */}
      {tab === "fotos" && (
        <div>
          {fotosView.filter((f) => !!f.url).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {fotosView.filter((f) => !!f.url).map((foto, i) => (
                <a key={foto.id} href={foto.url} target="_blank" rel="noopener noreferrer">
                  <img src={foto.url} alt={`Foto ${i+1}`} className="w-full aspect-square object-cover rounded-lg border border-border hover:border-primary transition-colors" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Camera size={40} className="mx-auto mb-3 opacity-30" />
              <p>No hay fotos registradas para esta orden</p>
            </div>
          )}
          {fotosView.some((f) => !f.url) && (
            <p className="text-xs text-yellow-400 mt-3">
              Algunas fotos antiguas no se pueden mostrar porque fueron guardadas con URL temporal (blob).
            </p>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {tab === "historial" && (
        <div className="data-card">
          <h3 className="font-heading font-bold uppercase tracking-wide mb-4">Historial de Movimientos Kanban</h3>
          {orden.historial_kanban?.length > 0 ? (
            <div className="space-y-3">
              {[...(orden.historial_kanban || [])].reverse().map((h, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                  <ChevronRight size={16} className="text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{h.estacion}</p>
                    <p className="text-xs text-muted-foreground">Por: {h.tecnico || "Sistema"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(h.fecha).toLocaleString("es-ES")}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Sin historial registrado</p>
          )}
        </div>
      )}
    </div>
  );
}