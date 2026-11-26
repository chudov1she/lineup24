"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  acceptCookieConsent,
  hasCookieConsent,
} from "@/lib/cookie-consent"
import { cn } from "@/lib/utils"

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!hasCookieConsent())
  }, [])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Согласие на использование cookie"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4",
      )}
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-white/10 bg-ink px-4 py-4 text-white shadow-[0_20px_60px_-24px_oklch(0_0_0/0.65)] sm:flex-row sm:items-center sm:gap-5 sm:px-5">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-white/80">
          Мы используем файлы cookie и сходные технологии, чтобы сайт работал
          корректно, сохранялась сессия и собиралась обезличенная статистика
          посещений. Продолжая пользоваться сайтом, вы подтверждаете согласие с{" "}
          <Link
            href="/cookie_policy"
            className="font-medium text-white underline underline-offset-4 hover:text-white/90"
          >
            политикой cookie
          </Link>{" "}
          и{" "}
          <Link
            href="/privacy_policy"
            className="font-medium text-white underline underline-offset-4 hover:text-white/90"
          >
            политикой конфиденциальности
          </Link>
          .
        </p>
        <Button
          type="button"
          size="lg"
          className="h-11 shrink-0 rounded-full bg-white px-6 font-medium text-ink hover:bg-white/90"
          onClick={() => {
            acceptCookieConsent()
            setVisible(false)
          }}
        >
          Согласен
        </Button>
      </div>
    </div>
  )
}
