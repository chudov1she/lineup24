/**
 * Client-local datetime helpers.
 * Display and calendar-day math always use the browser timezone — never force UTC.
 */

const LOCALE = "ru-RU"

export function toDate(value: string | number | Date): Date {
  if (value instanceof Date) return value
  return new Date(value)
}

/** YYYY-MM-DD in the client's local calendar. */
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Parse YYYY-MM-DD as local midnight (avoids UTC day shift). */
export function parseLocalDayKey(isoDay: string): Date {
  const [y, m, d] = isoDay.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addLocalDays(isoDay: string, delta: number): string {
  const date = parseLocalDayKey(isoDay)
  date.setDate(date.getDate() + delta)
  return localDayKey(date)
}

export function startOfLocalMonth(isoDay = localDayKey()): string {
  return `${isoDay.slice(0, 7)}-01`
}

export function formatDateTime(value: string | number | Date): string {
  return toDate(value).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDay(value: string | number | Date): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatShortDate(value: string | number | Date): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
  })
}

export function formatLongDate(value: string | number | Date): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/** Format a calendar day key without converting through UTC. */
export function formatDayKey(
  isoDay: string,
  style: "short" | "long" = "short",
): string {
  const date = parseLocalDayKey(isoDay)
  return style === "long" ? formatLongDate(date) : formatShortDate(date)
}
