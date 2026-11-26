"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { BankCoins } from "@/components/dashboard/bank-coins"
import { useSignalsActivityOptional } from "@/components/dashboard/signals-activity"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  ApiError,
  planLabel,
  subscriptionsApi,
  type PublicSubscription,
  type SubscriptionMeResponse,
} from "@/lib/api"
import { resolveBankSubscription } from "@/lib/dashboard-data"
import { formatDay } from "@/lib/datetime"
import { cn } from "@/lib/utils"

export function PlanStatusBanner({
  showEmptyCta = true,
}: {
  /** Empty “choose a plan” promo — hide on the subscription page itself. */
  showEmptyCta?: boolean
}) {
  const [data, setData] = useState<SubscriptionMeResponse | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const signals = useSignalsActivityOptional()

  useEffect(() => {
    return signals?.subscribeBankChanges(() => {
      setReloadToken((n) => n + 1)
    })
  }, [signals])

  useEffect(() => {
    void subscriptionsApi
      .me()
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setData(null)
      })
      .finally(() => setLoaded(true))
  }, [reloadToken])

  const resolved = resolveBankSubscription(data)
  const active: PublicSubscription | undefined = data?.activeSubscriptions[0]
  const isAdminLifetime = Boolean(active?.id.startsWith("admin-lifetime-"))

  if (!loaded) {
    return null
  }

  if (!active && !resolved) {
    if (!showEmptyCta) return null

    return (
      <div className="mx-4 flex flex-col gap-4 rounded-xl border border-dashed bg-muted/20 px-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:mx-6">
        <div className="min-w-0">
          <p className="font-heading text-base font-semibold tracking-tight">
            Подписка ещё не подключена
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Карточки и график заполнятся после тарифа. В «Сигналах» уже доступен
            архив.
          </p>
        </div>
        <Link
          href="/dashboard/subscription"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 shrink-0 rounded-full px-5",
          )}
        >
          Выбрать тариф
        </Link>
      </div>
    )
  }

  if (!active && resolved?.archived) {
    const past = resolved.sub
    const current = past.bankCurrentRub ?? 0
    const start = past.bankStartRub ?? 1000
    const periodEnd = past.completedAt ?? past.endsAt
    return (
      <div className="mx-4 overflow-hidden rounded-xl border bg-muted/30 px-4 py-4 lg:mx-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-lg font-semibold tracking-tight">
                {planLabel(past.plan)}
              </p>
              <Badge variant="secondary">Завершён</Badge>
            </div>
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>Итог банка</span>
              <BankCoins value={current} />
              <span>· старт</span>
              <BankCoins value={start} />
              {periodEnd ? (
                <span>· период до {formatDay(periodEnd)}</span>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">
              Архив сигналов и общая статистика ленты доступны в обзоре.
            </p>
          </div>
          <Link
            href="/dashboard/subscription"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "shrink-0 rounded-full",
            )}
          >
            Продлить
          </Link>
        </div>
      </div>
    )
  }

  if (!active) return null

  if (isAdminLifetime) {
    const current = active.bankCurrentRub ?? 0
    const start = active.bankStartRub ?? 1000
    return (
      <div className="mx-4 overflow-hidden rounded-xl border bg-linear-to-r from-primary/10 via-card to-card px-4 py-4 lg:mx-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-lg font-semibold tracking-tight">
                Админ-доступ
              </p>
              <Badge variant="outline">Бессрочно</Badge>
            </div>
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>Банк</span>
              <BankCoins value={current} />
              <span>· старт</span>
              <BankCoins value={start} />
              <span>· без цели, по всем закрытым ставкам</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isBoost = active.plan === "BANK_BOOST"
  const current = active.bankCurrentRub ?? 0
  const target = active.bankTargetRub ?? 1300
  const start = active.bankStartRub ?? 1000
  const pct =
    target > start
      ? Math.min(100, Math.round(((current - start) / (target - start)) * 100))
      : 0

  return (
    <div className="mx-4 overflow-hidden rounded-xl border bg-linear-to-r from-primary/10 via-card to-card px-4 py-4 lg:mx-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-lg font-semibold tracking-tight">
              {planLabel(active.plan)}
            </p>
            <Badge variant="outline">Активна</Badge>
          </div>
          {isBoost ? (
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>Банк</span>
              <BankCoins value={current} />
              <span>из</span>
              <BankCoins value={target} />
              <span>· до цели +30%</span>
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>Банк</span>
              <BankCoins value={current} />
              <span>· старт</span>
              <BankCoins value={start} />
              {active.endsAt ? (
                <span>· до {formatDay(active.endsAt)}</span>
              ) : (
                <span>· линия 30 дней</span>
              )}
            </p>
          )}
        </div>
      </div>
      {isBoost ? (
        <div className="mt-4 flex flex-col gap-2">
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              Старт <BankCoins value={start} />
            </span>
            <span className="tabular-nums">{pct}% пути к цели</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
