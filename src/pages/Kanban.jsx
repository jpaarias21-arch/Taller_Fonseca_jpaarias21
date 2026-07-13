// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { OrdenTrabajoAPI } from "@/api/OrdenTrabajo";
import { WhatsAppAPI } from "@/api/WhatsApp";
import { useToast } from "@/components/ui/use-toast";
import { StatusChangeWhatsappModal } from "@/components/StatusChangeWhatsappModal";
import { Car, AlertTriangle, Shield, User, Eye, X, Trash2 } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { buildStatusWhatsAppMessage, normalizeWhatsAppPhone } from "@/lib/whatsapp";
import { formatColones } from "@/lib/utils";

const STATIONS = [
  { id: "Recepción", color: "border-blue-500", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "Espera de Autorización", color: "border-yellow-500", badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { id: "Desarmado", color: "border-orange-500", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "Enderezado", color: "border-red-500", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
  { id: "Preparación", color: "border-purple-500", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "Cabina de Pintura", color: "border-pink-500", badge: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { id: "Armado", color: "border-indigo-500", badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  { id: "Pulido", color: "border-teal-500", badge: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  { id: "Control de Calidad", color: "border-green-500", badge: "bg-green-500/20 text-green-400 border-green-500/30" },
  { id: "Entregado", color: "border-emerald-500", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
];

const OPERATIVE = ["Desarmado", "Enderezado", "Preparación", "Cabina de Pintura", "Armado", "Pulido", "Control de Calidad", "Entregado"];

function KanbanCard({ orden, onMove, onDelete }) {
  const { toast } = useToast();
  const { canMoveKanban, canEditOrders } = useRole();
  const [blocked, setBlocked] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [pendingHistorial, setPendingHistorial] = useState([]);
  const [submittingStatusChange, setSubmittingStatusChange] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const currentIdx = STATIONS.findIndex(s => s.id === orden.estado_kanban);
  const isApproved = orden.estado_cotizacion === "Aprobado" || orden.estado_cotizacion === "Autorizado por Seguro";

  const hasWhatsappPhone = Boolean(normalizeWhatsAppPhone(orden?.cliente_telefono));

  const confirmStatusChange = async () => {
    const phone = normalizeWhatsAppPhone(orden?.cliente_telefono);
    if (!phone) {
      toast({
        title: "No se pudo confirmar",
        description: "Falta teléfono del cliente.",
        variant: "destructive"
      });
      return;
    }

    if (!pendingStatus) {
      toast({
        title: "No se pudo confirmar",
        description: "No hay una estación seleccionada para actualizar.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmittingStatusChange(true);

      let updatedOrder = null;
      try {
        updatedOrder = await OrdenTrabajoAPI.actualizarEstatusKanbanConHistorial(orden.id, pendingStatus, pendingHistorial);
      } catch {
        updatedOrder = await base44.entities.OrdenTrabajo.update(orden.id, {
          estado_kanban: pendingStatus,
          historial_kanban: pendingHistorial
        });
      }

      onMove(orden.id, pendingStatus, pendingHistorial, updatedOrder);

      try {
        await WhatsAppAPI.enviarEstatus({
          to: phone,
          message: pendingMessage,
          mode: "text",
          provider: "meta",
          order_id: orden?.id,
          estado: pendingStatus,
          placa: orden?.placa,
          cliente: orden?.cliente_nombre
        });

        toast({
          title: "Estatus actualizado",
          description: "El estado se actualizó y el cliente fue notificado por WhatsApp."
        });
      } catch (error) {
        toast({
          title: "Estatus actualizado con aviso",
          description: `Se actualizó el estado, pero no se pudo enviar WhatsApp: ${error?.message || "Error no identificado."}`,
          variant: "destructive"
        });
      }

      setStatusModalOpen(false);
      setPendingStatus("");
      setPendingMessage("");
      setPendingHistorial([]);
    } catch (error) {
      toast({
        title: "Error al confirmar el cambio",
        description: error?.message || "No fue posible actualizar el estado.",
        variant: "destructive"
      });
    } finally {
      setSubmittingStatusChange(false);
    }
  };

  const moveNext = async () => {
    if (currentIdx >= STATIONS.length - 1) return;
    const next = STATIONS[currentIdx + 1].id;
    if (OPERATIVE.includes(next) && !isApproved) {
      setBlocked(true);
      return;
    }
    const historial = [...(orden.historial_kanban || []), {
      estacion: next,
      fecha: new Date().toISOString(),
      tecnico: orden.tecnico_actual_nombre || "Sistema"
    }];

    if (!hasWhatsappPhone) {
      toast({
        title: "Movimiento bloqueado",
        description: "No se puede confirmar el cambio porque el cliente no tiene teléfono para WhatsApp.",
        variant: "destructive"
      });
    } else {
      setPendingStatus(next);
      setPendingMessage(buildStatusWhatsAppMessage(orden, next));
      setPendingHistorial(historial);
      setStatusModalOpen(true);
    }
  };

  const stationInfo = STATIONS.find(s => s.id === orden.estado_kanban);

  const handleDelete = async () => {
    const confirmed = window.confirm(`¿Eliminar la orden ${orden.numero_orden || orden.placa || "seleccionada"}?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete(orden);
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
      setDeleting(false);
    }
  };

  return (
    <div className={`kanban-card border-l-4 ${stationInfo?.color || "border-border"}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Car size={12} className="text-primary" />
            <span className="font-bold text-sm text-primary">{orden.placa}</span>
            {orden.es_asegurado && <Shield size={10} className="text-blue-400" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{orden.marca} {orden.modelo} {orden.anio}</p>
        </div>
        <div className="flex items-center gap-1">
          {canEditOrders && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive/80 p-0.5"
              title="Eliminar orden"
            >
              <Trash2 size={14} />
            </button>
          )}
          <Link to={`/ordenes/${orden.id}`} className="text-muted-foreground hover:text-primary p-0.5">
            <Eye size={14} />
          </Link>
        </div>
      </div>

      {/* Client */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <User size={10} />
        <span className="truncate">{orden.cliente_nombre}</span>
      </div>

      {/* Info grid */}
      <div className="space-y-1 text-xs">
        {orden.enderezador_nombre && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Enderezador:</span>
            <span className="font-medium text-right">{orden.enderezador_nombre}</span>
          </div>
        )}
        {orden.es_asegurado && orden.aseguradora && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seguro:</span>
            <span className="font-medium text-blue-400">{orden.aseguradora}</span>
          </div>
        )}
        {(orden.adelanto_dinero > 0) && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Adelanto:</span>
            <span className="font-medium text-green-400">
              {formatColones(orden.adelanto_dinero, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        {orden.recomendado_por && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ref:</span>
            <span className="font-medium truncate text-right">{orden.recomendado_por}</span>
          </div>
        )}
      </div>

      {/* Cotizacion badge */}
      <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
        <span className={`station-badge border text-xs ${
          isApproved ? "bg-green-500/20 text-green-400 border-green-500/30"
          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        }`}>
          {orden.estado_cotizacion}
        </span>
        {currentIdx < STATIONS.length - 1 && canMoveKanban && (
          <button
            onClick={moveNext}
            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
              isApproved || !OPERATIVE.includes(STATIONS[currentIdx + 1]?.id)
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            → Avanzar
          </button>
        )}
      </div>

      {blocked && (
        <div className="mt-1 flex items-center justify-between gap-1 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1">
          <div className="flex items-center gap-1">
            <AlertTriangle size={10} />
            <span>Requiere cotización aprobada</span>
          </div>
          <button onClick={() => setBlocked(false)} className="hover:text-destructive/70 ml-1">
            <X size={10} />
          </button>
        </div>
      )}

      <StatusChangeWhatsappModal
        open={statusModalOpen}
        onOpenChange={(open) => {
          setStatusModalOpen(open);
          if (!open && !submittingStatusChange) {
            setPendingStatus("");
            setPendingMessage("");
            setPendingHistorial([]);
          }
        }}
        stage={pendingStatus}
        message={pendingMessage}
        onMessageChange={setPendingMessage}
        onConfirm={confirmStatusChange}
        isSubmitting={submittingStatusChange}
        disableConfirm={!pendingStatus || !pendingMessage?.trim() || !hasWhatsappPhone}
        disableReason={!hasWhatsappPhone ? "Este cliente no tiene teléfono válido para WhatsApp." : ""}
      />
    </div>
  );
}

export default function Kanban() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.OrdenTrabajo.filter({}).then(data => {
      setOrdenes(data.filter(o => o.estado_kanban !== "Entregado"));
      setLoading(false);
    });
  }, []);

  const handleMove = (id, newStation, historial) => {
    setOrdenes(prev => prev.map(o =>
      o.id === id ? { ...o, estado_kanban: newStation, historial_kanban: historial } : o
    ).filter(o => o.estado_kanban !== "Entregado"));
  };

  const handleDeleteOrder = async (orden) => {
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
  };

  const cardsByStation = useMemo(() => {
    const grouped = {};
    for (const station of STATIONS) grouped[station.id] = [];
    for (const orden of ordenes) {
      const station = orden.estado_kanban;
      if (!station || !grouped[station]) continue;
      grouped[station].push(orden);
    }
    return grouped;
  }, [ordenes]);

  const entregados = useMemo(() => cardsByStation["Entregado"] || [], [cardsByStation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Estatus del Taller</h1>
        <p className="text-muted-foreground text-sm">{ordenes.length} vehículo(s) activo(s) · Haga clic en "Avanzar" para mover al siguiente estado</p>
      </div>

      {/* Kanban board — horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STATIONS.filter(s => s.id !== "Entregado").map(station => {
            const cards = cardsByStation[station.id] || [];
            return (
              <div key={station.id} className="w-64 flex-shrink-0">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-t-2 bg-secondary/50 ${station.color}`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">{station.id}</span>
                  <span className={`station-badge border ${station.badge}`}>{cards.length}</span>
                </div>
                {/* Cards */}
                <div className="min-h-32 bg-secondary/20 rounded-b-lg border border-border border-t-0 p-2 space-y-2">
                  {cards.map(orden => (
                    <KanbanCard key={orden.id} orden={orden} onMove={handleMove} onDelete={handleDeleteOrder} />
                  ))}
                  {cards.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-xs opacity-50">
                      Sin vehículos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entregados section */}
      <div className="data-card">
        <h3 className="font-heading font-bold uppercase tracking-wide mb-3 text-emerald-400">
          Vehículos Entregados
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entregados.map(o => (
            <Link key={o.id} to={`/ordenes/${o.id}`} className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors">
              <Car size={14} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{o.placa}</p>
                <p className="text-xs text-muted-foreground">{o.cliente_nombre}</p>
              </div>
            </Link>
          ))}
          {entregados.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-3">Ningún vehículo entregado hoy</p>
          )}
        </div>
      </div>
    </div>
  );
}