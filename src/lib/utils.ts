import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formato estándar de moneda para el sistema (Quetzales GTQ)
 * Ejemplo: Q 1,250.00
 */
export function formatCurrency(amount: number | null | undefined, symbol: string = "Q"): string {
  const numericAmount = Number(amount || 0);
  const formatted = new Intl.NumberFormat("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);

  return `${symbol} ${formatted}`;
}

/**
 * Formato de fecha para Guatemala
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-GT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/Guatemala",
  }).format(date);
}

/**
 * Formato de fecha y hora completa
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-GT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Guatemala",
  }).format(date);
}
