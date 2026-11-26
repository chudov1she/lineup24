const STORAGE_KEY = "lineup24:signals:last-seen-at"

export function getSignalsLastSeenAt(): number {
  if (typeof window === "undefined") return 0
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export function setSignalsLastSeenAt(timestamp = Date.now()): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, String(timestamp))
}
