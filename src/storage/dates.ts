// Calendar dates (no time, no timezone) travel as "YYYY-MM-DD", matching a
// Postgres `date` column. Always build them from local date parts:
// toISOString() is UTC, so an evening in the Americas becomes tomorrow.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

/** Local-midnight Date for a "YYYY-MM-DD" string, or null if it isn't one. */
export function parseDateString(value: string): Date | null {
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  // Rejects roll-overs like 2026-02-31.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/**
 * Coerces whatever an older outfit stored as its date (the field used to be
 * free text) into "YYYY-MM-DD", or "" when it can't be read as a date.
 */
export function normalizeDateString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (ISO_DATE.test(trimmed)) return parseDateString(trimmed) ? trimmed : "";
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : toDateString(parsed);
}

export function formatDate(value: string): string {
  const date = parseDateString(value);
  return date
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : value;
}
