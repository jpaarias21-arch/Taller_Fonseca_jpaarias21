import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * @param {...unknown[]} inputs
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

/**
 * @param {unknown} value
 */
export function formatDisplayDateTime(value) {
  if (!value) return "-";

  const raw = String(value).trim();
  const isoLike = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);

  if (isoLike) {
    const [, yyyy, mm, dd, hh, min] = isoLike;
    const hours = hh ?? "00";
    const minutes = min ?? "00";
    return `${dd}/${mm}/${yyyy} ${hours}:${minutes}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * @param {unknown} value
 * @param {{ minimumFractionDigits?: number, maximumFractionDigits?: number }} [options]
 */
export function formatColones(value, options = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }

  const minimumFractionDigits = options.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;

  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}


export const isIframe = window.self !== window.top;
