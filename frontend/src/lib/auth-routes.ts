import type { SubscriptionPlan } from "@/lib/api"

export type AuthBase = "login" | "register"

export const AUTH_PATHS: Record<AuthBase, string> = {
  login: "/login",
  register: "/signup",
}

export function authHref(
  base: AuthBase,
  planCode?: SubscriptionPlan | null,
): string {
  const path = AUTH_PATHS[base]
  if (!planCode) return path
  const params = new URLSearchParams({ plan: planCode })
  return `${path}?${params.toString()}`
}
