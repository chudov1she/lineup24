export const SIDEBAR_COOKIE_NAME = "sidebar_state"
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Cookie stores `"true"` (expanded) or `"false"` (collapsed). */
export function sidebarOpenFromCookie(
  value: string | undefined,
  fallback = true,
): boolean {
  if (value === "true") return true
  if (value === "false") return false
  return fallback
}
