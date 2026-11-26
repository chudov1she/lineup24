const STORAGE_KEY = "lineup24:cookie-consent"
/** Bump when cookie categories / policy text change enough to re-ask. */
export const COOKIE_CONSENT_VERSION = "2026-11-26"

export type CookieConsentRecord = {
  version: string
  acceptedAt: string
}

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CookieConsentRecord
    if (
      !parsed ||
      typeof parsed.version !== "string" ||
      typeof parsed.acceptedAt !== "string"
    ) {
      return null
    }
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function hasCookieConsent(): boolean {
  return readCookieConsent() !== null
}

export function acceptCookieConsent(): CookieConsentRecord {
  const record: CookieConsentRecord = {
    version: COOKIE_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    window.dispatchEvent(
      new CustomEvent("lineup24:cookie-consent", { detail: record }),
    )
  }
  return record
}
