"use client"

import { useState } from "react"
import Link from "next/link"

import { useAuthSession } from "@/components/auth/auth-session"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { authApi } from "@/lib/api"
import { toast } from "@/components/ui/toast"

export function TosReacceptGate({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuthSession()
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  const needsReaccept = Boolean(user?.needsTosReaccept)

  async function accept() {
    if (!legalAccepted) {
      toast.add({
        title: "Нужно принять документы",
        type: "error",
      })
      return
    }
    setLoading(true)
    try {
      await authApi.acceptLegal({ tosAccepted: true, privacyAccepted: true })
      await refreshUser()
      toast.add({ title: "Документы приняты", type: "success" })
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Ошибка",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Keep children mounted so Instant Navigation can validate page segments. */}
      <div className={needsReaccept ? "hidden" : "contents"}>{children}</div>
      {needsReaccept && user ? (
        <div className="flex min-h-[60vh] flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl border p-6">
            <div>
              <h1 className="text-xl font-semibold">Обновление документов</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Чтобы продолжить работу в кабинете, примите актуальные версии
                пользовательского соглашения и политики конфиденциальности.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm leading-snug">
              <Checkbox
                id="legal"
                checked={legalAccepted}
                onCheckedChange={(v) => setLegalAccepted(v === true)}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1 text-muted-foreground">
                Принимаю{" "}
                <Link
                  href="/user_agreement"
                  className="text-foreground underline underline-offset-4"
                  target="_blank"
                >
                  пользовательское соглашение
                </Link>{" "}
                (v{user.tosCurrentVersion}),{" "}
                <Link
                  href="/privacy_policy"
                  className="text-foreground underline underline-offset-4"
                  target="_blank"
                >
                  политику конфиденциальности
                </Link>{" "}
                (v{user.privacyCurrentVersion}) и{" "}
                <Link
                  href="/cookie_policy"
                  className="text-foreground underline underline-offset-4"
                  target="_blank"
                >
                  политику cookie
                </Link>
              </span>
            </label>
            <Button
              className="w-full"
              disabled={loading}
              onClick={() => void accept()}
            >
              {loading ? "Сохранение…" : "Продолжить"}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
