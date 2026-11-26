"use client"

import { Suspense, type ReactNode } from "react"

import { AuthSessionProvider } from "@/components/auth/auth-session"
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthSessionProvider>
        {children}
        <CookieConsentBanner />
      </AuthSessionProvider>
    </Suspense>
  )
}