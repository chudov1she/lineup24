"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { useAuthSession } from "@/components/auth/auth-session"
import { Spinner } from "@/components/ui/spinner"

export function AdminOnly({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuthSession()
  const allowed = Boolean(user && user.role === "ADMIN")
  const blocked = loading || !allowed

  useEffect(() => {
    if (!loading && user && user.role !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [loading, user, router])

  return (
    <>
      <div className={blocked ? "hidden" : "contents"}>{children}</div>
      {blocked ? (
        <div className="flex min-h-[40vh] flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : null}
    </>
  )
}
