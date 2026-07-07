const DEFAULT_COUNTRY_CODE = "506";

const STATUS_TEMPLATE = {
  "Recepción": "Tu vehículo fue recibido correctamente y ya está en nuestro proceso interno.",
  "Espera de Autorización": "Estamos a la espera de autorización para continuar con los trabajos.",
  "Desarmado": "Iniciamos la etapa de desarmado para inspección y reparación.",
  "Enderezado": "El vehículo se encuentra en proceso de enderezado de estructura y piezas.",
  "Preparación": "Estamos preparando superficie y componentes para pintura.",
  "Cabina de Pintura": "Tu vehículo ingresó a cabina de pintura.",
  "Armado": "Estamos en etapa de armado y reinstalación de componentes.",
  "Pulido": "Tu vehículo está en proceso de acabados y pulido.",
  "Control de Calidad": "Estamos realizando revisión final de calidad.",
  "Entregado": "Tu vehículo está listo para entrega. Gracias por confiar en nosotros."
};

export function normalizeWhatsAppPhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 8) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  if (digits.length === 11 && digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits;

  return digits;
}

export function buildStatusWhatsAppMessage(orden, nuevoEstado) {
  const cliente = orden?.cliente_nombre || "cliente";
  const placa = orden?.placa || "sin placa";
  const vehiculo = [orden?.marca, orden?.modelo, orden?.anio].filter(Boolean).join(" ");
  const numeroOrden = orden?.numero_orden ? `Orden: ${orden.numero_orden}` : "";
  const cuerpoEstado = STATUS_TEMPLATE[nuevoEstado] || `Tu vehículo cambió al estado: ${nuevoEstado}.`;

  return [
    `Hola ${cliente},`,
    `Vehículo: ${vehiculo || "No indicado"} (${placa}).`,
    numeroOrden,
    cuerpoEstado,
    "Cualquier consulta estamos para servirte.",
    "Taller Fonseca"
  ].filter(Boolean).join("\n");
}

export function openWhatsAppForOrderStatus(orden, nuevoEstado) {
  const phone = normalizeWhatsAppPhone(orden?.cliente_telefono);
  if (!phone) {
    return { ok: false, reason: "missing_phone" };
  }

  const message = buildStatusWhatsAppMessage(orden, nuevoEstado);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return { ok: true, url };
}
