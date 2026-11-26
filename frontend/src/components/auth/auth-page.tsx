"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { useAuthSession } from "@/components/auth/auth-session"
import { LoginForm, type AuthMode } from "@/components/login-form"
import { TilePattern } from "@/components/motion/tile-pattern"
import { site } from "@/data/site"
import { authHref, type AuthBase } from "@/lib/auth-routes"
import type { SubscriptionPlan } from "@/lib/api"

function isPlanCode(value: string | null): value is SubscriptionPlan {
  return value === "BANK_BOOST" || value === "MONTHLY"
}

function AuthPageContent({ base }: { base: AuthBase }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuthSession()

  const [step, setStep] = useState<AuthMode>(
    base === "login" ? "login" : "register",
  )

  const planCode = useMemo(() => {
    const raw = searchParams.get("plan")
    return isPlanCode(raw) ? raw : null
  }, [searchParams])

  useEffect(() => {
    setStep(base === "login" ? "login" : "register")
  }, [base])

  useEffect(() => {
    if (loading || !user) return
    if (step === "verify" || step === "forgot" || step === "reset") return
    if (!user.emailVerifiedAt) {
      setStep("verify")
      return
    }
    router.replace(planCode ? "/dashboard/subscription" : "/dashboard")
  }, [loading, user, planCode, router, step])

  function setMode(next: AuthMode) {
    if (next === "login") {
      if (base !== "login") {
        router.push(authHref("login", planCode))
        return
      }
      setStep("login")
      return
    }

    if (next === "register") {
      if (base !== "register") {
        router.push(authHref("register", planCode))
        return
      }
      setStep("register")
      return
    }

    // forgot / reset / verify — remain on the current /login or /signup URL
    setStep(next)
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-sheet p-6 text-ink md:p-10">
      <TilePattern
        variant="mesh"
        tone="dark"
        className="text-ink opacity-[0.14]"
      />
      <Link
        href="/"
        className="absolute top-3 left-3 z-10 font-display pl-1 text-lg tracking-[0.06em] text-ink sm:top-5 sm:left-6 sm:text-2xl lg:left-8"
      >
        {site.name}
      </Link>
      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={base}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <LoginForm mode={step} planCode={planCode} onModeChange={setMode} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function AuthPageFallback() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-sheet text-sm text-ink/50">
      <TilePattern
        variant="mesh"
        tone="dark"
        className="text-ink opacity-[0.14]"
      />
      <span className="relative z-10">Загрузка…</span>
    </div>
  )
}

export function AuthPage({ base }: { base: AuthBase }) {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent base={base} />
    </Suspense>
  )
}
