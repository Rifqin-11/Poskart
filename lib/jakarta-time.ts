const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const JAKARTA_OFFSET = "+07:00";

function getParts(value: Date, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    ...options,
  }).formatToParts(value);
  return (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
}

/** Parses a date or datetime form value as Asia/Jakarta when no offset exists. */
export function parseJakartaDateTimeInput(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T00:00:00${JAKARTA_OFFSET}`);
  }
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized);
  }
  const withSeconds = normalized.length === 16
    ? `${normalized}:00`
    : normalized;
  return new Date(`${withSeconds}${JAKARTA_OFFSET}`);
}

export function getJakartaDayStart(value: string) {
  return parseJakartaDateTimeInput(value);
}

export function formatJakartaDateInput(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const part = getParts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatJakartaDateTimeLocal(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const part = getParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
