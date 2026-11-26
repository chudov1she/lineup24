const STORAGE_KEY = "lineup_device_fp"

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server"
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const next = randomId()
    window.localStorage.setItem(STORAGE_KEY, next)
    return next
  } catch {
    return randomId()
  }
}

export function getDeviceMeta() {
  if (typeof window === "undefined") {
    return {
      deviceFingerprint: "server",
      platform: "server",
      deviceType: "server",
    }
  }
  const ua = navigator.userAgent
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  return {
    deviceFingerprint: getDeviceFingerprint(),
    platform: navigator.platform || "unknown",
    deviceType: isMobile ? "mobile" : "desktop",
  }
}
