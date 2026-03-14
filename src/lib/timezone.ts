/**
 * Sri Lanka timezone utilities (Asia/Colombo, UTC+05:30)
 */
export const SL_TIMEZONE = "Asia/Colombo";

/** Format a date string or Date to Sri Lanka locale display */
export function formatSLDateTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleString("en-GB", { timeZone: SL_TIMEZONE });
}

/** Format date-only in Sri Lanka timezone */
export function formatSLDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { timeZone: SL_TIMEZONE });
}

/** Format time-only in Sri Lanka timezone */
export function formatSLTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    timeZone: SL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convert a datetime-local input value (YYYY-MM-DDTHH:mm) to an ISO string
 * interpreted as Asia/Colombo time.
 * datetime-local has no timezone info, so we append the +05:30 offset.
 */
export function localInputToSLISO(datetimeLocal: string): string {
  if (!datetimeLocal) return "";
  // Append Sri Lanka offset so the server stores the correct absolute time
  return `${datetimeLocal}:00+05:30`;
}

/**
 * Convert a UTC/ISO date string to a datetime-local value displayed in Sri Lanka time
 * for pre-filling an <input type="datetime-local" />.
 */
export function isoToSLLocalInput(isoStr: string): string {
  if (!isoStr) return "";
  const formatted = new Date(isoStr).toLocaleString("sv-SE", {
    timeZone: SL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: undefined,
  });
  // sv-SE gives "YYYY-MM-DD HH:mm", convert space to T
  return formatted.replace(" ", "T").slice(0, 16);
}
