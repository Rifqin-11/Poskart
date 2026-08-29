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

/** Converts a date-only form value to the end of that day in Asia/Jakarta. */
export function parseJakartaDateInputEnd(value: string) {
  const date = parseJakartaDateTimeInput(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Adds calendar months to a Jakarta date-only form value. */
export function addJakartaMonthsToDateInput(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite) || months < 0) return "";
  const targetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  const date = new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth(),
      Math.min(day, lastDayOfTargetMonth),
    ),
  );
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
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
