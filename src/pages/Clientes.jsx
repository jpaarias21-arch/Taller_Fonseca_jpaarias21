// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Car, Phone, MapPin, Shield, Eye, Users, Clock, FileText, Camera } from "lucide-react";
import { formatDisplayDateTime } from "@/lib/utils";

const normalize = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const buildClientKey = (nombre, telefono, cedula) =>
  `${normalize(nombre)}|${String(telefono || "").replace(/\D/g, "")}|${String(cedula || "").replace(/\D/g, "")}`;

export default function Clientes() {
  const [ordenes, setOrdenes] = useState([]);
  const [clientesDb, setClientesDb] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoOverrides, setPhotoOverrides] = useState({});
  const photoInputRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordenesData, clientesData] = await Promise.all([
          base44.entities.OrdenTrabajo.list("-created_date", 500),
          base44.entities.Cliente.list(),
        ]);
        setOrdenes(Array.isArray(ordenesData) ? ordenesData : []);
        setClientesDb(Array.isArray(clientesData) ? clientesData : []);
      } catch {
        setOrdenes([]);
        setClientesDb([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const clientesDbById = useMemo(() => {
    const index = new Map();
    for (const c of clientesDb) {
      if (c?.id !== undefined && c?.id !== null) {
        index.set(String(c.id), c);
      }
    }
    return index;
  }, [clientesDb]);

  const clientesDbByKey = useMemo(() => {
    const index = new Map();
    for (const c of clientesDb) {
      const key = buildClientKey(c?.nombre_completo, c?.telefono, c?.cedula);
      if (!index.has(key)) {
        index.set(key, c);
      }
    }
    return index;
  }, [clientesDb]);

  // Group by client key (name + phone + id card)
  const clientes = useMemo(() => {
    const grouped = {};
    ordenes.forEach((o) => {
      const key = buildClientKey(o.cliente_nombre, o.cliente_telefono, o.cliente_cedula);
      if (!key) return;

      const dbMatch =
        (o?.cliente_id ? clientesDbById.get(String(o.cliente_id)) : null) ||
        clientesDbByKey.get(key) ||
        null;

      if (!grouped[key]) {
        grouped[key] = {
          key,
          nombre: o.cliente_nombre,
          telefono: o.cliente_telefono,
          cedula: o.cliente_cedula,
          procedencia: o.lugar_procedencia,
          db_cliente_id: dbMatch?.id ?? o?.cliente_id ?? null,
          foto_url: dbMatch?.foto_url || null,
          ordenes: [],
        };
      }

      if (!grouped[key].db_cliente_id && (dbMatch?.id || o?.cliente_id)) {
        grouped[key].db_cliente_id = dbMatch?.id ?? o?.cliente_id;
      }

      grouped[key].ordenes.push(o);
    });

    Object.values(grouped).forEach((cliente) => {
      if (photoOverrides[cliente.key]) {
        cliente.foto_url = photoOverrides[cliente.key];
      }
    });

    return grouped;
  }, [ordenes, clientesDbById, clientesDbByKey, photoOverrides]);

  const searchLower = search.toLowerCase();

  const clientesList = useMemo(() => {
    return Object.values(clientes).filter((c) => {
      return (
        c.nombre?.toLowerCase().includes(searchLower) ||
        c.telefono?.includes(searchLower) ||
        c.cedula?.includes(searchLower) ||
        c.ordenes.some((o) => o.placa?.toLowerCase().includes(searchLower))
      );
    });
  }, [clientes, searchLower]);

  const selectedData = useMemo(() => (selected ? clientes[selected] : null), [clientes, selected]);

  const triggerPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  const handleClientPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedData) return;

    setSavingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const currentId = selectedData.db_cliente_id ? String(selectedData.db_cliente_id) : null;

      if (currentId) {
        const updated = await base44.entities.Cliente.update(currentId, { foto_url: file_url });
        setClientesDb((prev) => prev.map((c) => (String(c.id) === currentId ? { ...c, ...updated } : c)));
      } else {
        const created = await base44.entities.Cliente.create({
          nombre_completo: selectedData.nombre,
          telefono: selectedData.telefono || "",
          cedula: selectedData.cedula || "",
          lugar_procedencia: selectedData.procedencia || "",
          foto_url: file_url,
        });
        setClientesDb((prev) => [...prev, created]);
      }

      setPhotoOverrides((prev) => ({ ...prev, [selectedData.key]: file_url }));
    } catch {
      // Fallback visual local para no bloquear UX si el esquema no tiene foto_url.
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setPhotoOverrides((prev) => ({ ...prev, [selectedData.key]: file_url }));
      } catch {
        // No-op: evitamos romper la vista si la subida falla.
      }
    } finally {
      setSavingPhoto(false);
    }
  };

  const formatTelefono = (val = "") => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    return digits.slice(0, 4) + "-" + digits.slice(4);
  };

  const formatCedula = (val = "") => {
    const digits = val.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 1) return digits;
    if (digits.length <= 5) return digits.slice(0, 1) + "-" + digits.slice(1);
    return digits.slice(0, 1) + "-" + digits.slice(1, 5) + "-" + digits.slice(5);
  };

  // Stats
  const totalClientes = useMemo(() => Object.keys(clientes).length, [clientes]);
  const enTaller = useMemo(() => ordenes.filter((o) => o.estado_kanban !== "Entregado").length, [ordenes]);
  const pendientes = useMemo(
    () => ordenes.filter((o) => o.estado_cotizacion === "Borrador" || o.estado_cotizacion === "Enviado").length,
    [ordenes]
  );

  const getKanbanColor = (estado) => {
    const map = {
      "Recepción": "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "Espera de Autorización": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      "Desarmado": "bg-orange-500/20 text-orange-400 border-orange-500/30",
      "Enderezado": "bg-red-500/20 text-red-400 border-red-500/30",
      "Preparación": "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "Cabina de Pintura": "bg-pink-500/20 text-pink-400 border-pink-500/30",
      "Armado": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      "Pulido": "bg-teal-500/20 text-teal-400 border-teal-500/30",
      "Control de Calidad": "bg-green-500/20 text-green-400 border-green-500/30",
      "Entregado": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    };
    return map[estado] || "bg-secondary text-muted-foreground border-border";
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide">Base de Clientes</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Historial completo por cliente</p>
        </div>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Clientes</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-heading font-bold text-primary">{totalClientes}</span>
            <Users size={16} className="text-muted-foreground mb-1" />
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border-l-4 border-primary border-y border-r border-white/10 rounded-xl p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Vehículos en Taller</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-heading font-bold text-foreground">{enTaller}</span>
            <Car size={16} className="text-muted-foreground mb-1" />
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-4 col-span-2 lg:col-span-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Cotizaciones Pendientes</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-heading font-bold text-yellow-400">{pendientes}</span>
            <FileText size={16} className="text-muted-foreground mb-1" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono, cédula o placa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Client list */}
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clientesList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm bg-card/70 backdrop-blur-md border border-white/10 rounded-xl">
              No se encontraron clientes
            </div>
          ) : (
            clientesList.map(c => {
              const activos = c.ordenes.filter(o => o.estado_kanban !== "Entregado").length;
              return (
                <button
                  key={c.key}
                  onClick={() => setSelected(c.key)}
                  className={`w-full text-left rounded-xl border transition-all overflow-hidden ${
                    selected === c.key
                      ? "bg-primary/10 border-primary"
                      : "bg-card/70 backdrop-blur-md border-white/10 hover:border-primary/40"
                  }`}
                >
                  {/* Color strip on left */}
                  <div className="flex">
                    <div className={`w-1 flex-shrink-0 ${activos > 0 ? "bg-primary" : "bg-border"}`} />
                    <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-secondary/80 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {c.foto_url ? (
                          <img src={c.foto_url} alt={c.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading font-bold text-sm text-foreground truncate uppercase">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {formatTelefono(c.telefono)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Car size={10} /> {c.ordenes.length} orden(es)
                          </span>
                          {activos > 0 && (
                            <span className="text-xs text-primary font-semibold">• {activos} activo(s)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {!selectedData ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-card/70 backdrop-blur-md border border-white/10 rounded-xl">
              <User size={40} className="mb-3 opacity-20" />
              <p>Seleccione un cliente para ver su historial</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client info card */}
              <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl p-5 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="relative w-12 h-12 rounded-xl bg-secondary/80 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {selectedData.foto_url ? (
                      <img src={selectedData.foto_url} alt={selectedData.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <User size={22} className="text-primary" />
                    )}
                    <button
                      type="button"
                      onClick={triggerPhotoPicker}
                      disabled={savingPhoto}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground border border-background flex items-center justify-center disabled:opacity-60"
                      title={savingPhoto ? "Subiendo foto..." : "Subir/cambiar foto"}
                    >
                      <Camera size={12} />
                    </button>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleClientPhotoUpload}
                  />
                  <div>
                    <h2 className="font-heading font-bold text-2xl uppercase tracking-wide">{selectedData.nombre}</h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      {selectedData.telefono && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone size={13} className="text-primary" /> {formatTelefono(selectedData.telefono)}
                        </span>
                      )}
                      {selectedData.cedula && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Shield size={13} className="text-primary" /> {formatCedula(selectedData.cedula)}
                        </span>
                      )}
                      {selectedData.procedencia && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin size={13} className="text-primary" /> {selectedData.procedencia}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders */}
              <div className="bg-card/70 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50">
                  <h3 className="font-heading font-bold uppercase tracking-wide">
                    Historial de Vehículos ({selectedData.ordenes.length})
                  </h3>
                </div>
                <div className="divide-y divide-border/30">
                  {selectedData.ordenes.map(o => (
                    <div key={o.id} className="relative p-4 hover:bg-white/[0.02] transition-colors">
                      {/* Left accent strip */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${o.estado_kanban === "Entregado" ? "bg-emerald-500" : "bg-primary"}`} />
                      <div className="pl-3 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Car size={14} className="text-primary" />
                            <span className="font-heading font-bold text-primary text-lg">{o.placa}</span>
                            <span className="text-sm text-muted-foreground">{o.marca} {o.modelo} {o.anio}</span>
                          </div>
                          <Link to={`/ordenes/${o.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1 hover:bg-primary/10">
                              <Eye size={12} /> Ver OT
                            </Button>
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Ingreso</p>
                            <p className="font-medium flex items-center gap-1"><Clock size={10} className="text-muted-foreground" />{formatDisplayDateTime(o.fecha_ingreso)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Estado</p>
                            <span className={`station-badge border text-xs ${getKanbanColor(o.estado_kanban)}`}>{o.estado_kanban}</span>
                          </div>
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Cotización</p>
                            <p className="font-medium">{o.estado_cotizacion}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Total</p>
                            <p className="font-heading font-bold text-primary text-base">₡{Number(o.monto_cotizado || 0).toFixed(2)}</p>
                          </div>
                        </div>
                        {o.es_asegurado && (
                          <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 w-fit">
                            <Shield size={11} />
                            <span>{o.aseguradora} — Reclamo: {o.numero_reclamo}</span>
                          </div>
                        )}
                        {o.fotos?.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto">
                            {o.fotos.slice(0, 4).map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                              </a>
                            ))}
                            {o.fotos.length > 4 && (
                              <div className="w-14 h-14 rounded-lg border border-white/10 bg-secondary/80 flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                                +{o.fotos.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}