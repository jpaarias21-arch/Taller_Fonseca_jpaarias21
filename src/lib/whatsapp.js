import { getStatusMessage } from "@/messageTemplates";

const DEFAULT_COUNTRY_CODE = "506";

export function normalizeWhatsAppPhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 8) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  if (digits.length === 11 && digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits;

  return digits;
}

export function buildStatusWhatsAppMessage(orden, nuevoEstado) {
  const cliente = orden?.cliente_nombre || orden?.cliente || "cliente";
  const placa = orden?.placa || "sin placa";
  const marcaModelo = [orden?.marca, orden?.modelo, orden?.anio].filter(Boolean).join(" ") || "vehículo";
  const numeroOrden = orden?.numero_orden ? `Orden: ${orden.numero_orden}` : "";
  const cuerpoEstado = getStatusMessage(
    {
      cliente_nombre: cliente,
      marca_modelo: marcaModelo,
      placa,
      marca: orden?.marca,
      modelo: orden?.modelo
    },
    nuevoEstado
  );

  return [
    cuerpoEstado,
    numeroOrden,
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
