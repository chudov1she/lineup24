"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { useAuthSession } from "@/components/auth/auth-session"
import { Spinner } from "@/components/ui/spinner"

export function DashboardAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuthSession()
  const blocked = loading || !user

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  return (
    <>
      {/* Keep children in the tree for Instant Navigation validation. */}
      <div className={blocked ? "hidden" : "contents"}>{children}</div>
      {blocked ? (
        <div className="flex min-h-svh flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : null}
    </>
  )
}
