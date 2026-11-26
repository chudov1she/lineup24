"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { useAuthSession } from "@/components/auth/auth-session"
import { BankCoins } from "@/components/dashboard/bank-coins"
import { PlanStatusBanner } from "@/components/dashboard/plan-status-banner"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { plans } from "@/data/site"
import {
  ApiError,
  formatDay,
  paymentsApi,
  planLabel,
  subscriptionsApi,
  toastApiError,
  type PublicSubscription,
  type SubscriptionMeResponse,
  type SubscriptionPlan,
  type SubscriptionProduct,
} from "@/lib/api"
import { CheckIcon } from "lucide-react"

function statusLabel(status: PublicSubscription["status"]) {
  switch (status) {
    case "ACTIVE":
      return "Активна"
    case "COMPLETED":
      return "Завершена"
    case "REVOKED":
      return "Отозвана"
  }
}

function statusVariant(
  status: PublicSubscription["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default"
    case "COMPLETED":
      return "secondary"
    case "REVOKED":
      return "destructive"
  }
}

function runDetails(item: PublicSubscription) {
  if (item.plan === "BANK_BOOST") {
    if (item.bankCurrentRub == null || item.bankTargetRub == null) return "—"
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <BankCoins value={item.bankCurrentRub} />
        <span>/</span>
        <BankCoins value={item.bankTargetRub} />
      </span>
    )
  }

  if (item.endsAt) {
    return `до ${formatDay(item.endsAt)}`
  }

  return "—"
}

function productMeta(code: SubscriptionPlan) {
  return plans.find((plan) => plan.code === code)
}

export function SubscriptionView() {
  const { user } = useAuthSession()
  const isAdmin = user?.role === "ADMIN"
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<SubscriptionProduct[]>([])
  const [me, setMe] = useState<SubscriptionMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(
    null,
  )
  const [awaitingPayment, setAwaitingPayment] = useState(false)

  async function refreshMe() {
    const subscription = await subscriptionsApi.me()
    setMe(subscription)
    return subscription
  }

  useEffect(() => {
    void Promise.all([subscriptionsApi.products(), subscriptionsApi.me()])
      .then(([list, subscription]) => {
        setProducts(list)
        setMe(subscription)
      })
      .catch(() => {
        setProducts([])
        setMe(null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const payment = searchParams.get("payment")
    if (!payment) return

    let cancelled = false

    void (async () => {
      try {
        const subscription = await refreshMe()
        if (cancelled) return

        if (payment === "failed") {
          toast.add({
            title: "Оплата не завершена",
            description: "Можно выбрать тариф и попробовать снова.",
            type: "warning",
          })
          setAwaitingPayment(false)
          return
        }

        if (payment === "success") {
          if (subscription.activePlans.length > 0) {
            toast.add({
              title: "Подписка активирована",
              type: "success",
            })
            setAwaitingPayment(false)
          } else {
            setAwaitingPayment(true)
            toast.add({
              title: "Ожидаем подтверждение платежа",
              description: "Обычно это занимает несколько секунд.",
              type: "info",
            })
          }
        }
      } catch {
        if (!cancelled) {
          toast.add({
            title: "Не удалось обновить статус подписки",
            type: "error",
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  useEffect(() => {
    if (!awaitingPayment) return

    const timer = window.setInterval(() => {
      void refreshMe()
        .then((subscription) => {
          if (subscription.activePlans.length > 0) {
            setAwaitingPayment(false)
            toast.add({
              title: "Подписка активирована",
              type: "success",
            })
          }
        })
        .catch(() => undefined)
    }, 3000)

    const stop = window.setTimeout(() => {
      window.clearInterval(timer)
      setAwaitingPayment(false)
    }, 60_000)

    return () => {
      window.clearInterval(timer)
      window.clearTimeout(stop)
    }
  }, [awaitingPayment])

  const history = useMemo(
    () =>
      (me?.history ?? [])
        .slice()
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [me],
  )

  async function handleCheckout(plan: SubscriptionPlan) {
    setCheckoutPlan(plan)
    try {
      const { paymentUrl } = await paymentsApi.checkout(plan)
      window.location.assign(paymentUrl)
    } catch (error) {
      if (!(error instanceof ApiError && error.isRateLimited)) {
        toastApiError(error, {
          title: "Не удалось создать оплату",
          description: "Попробуйте позже",
        })
      }
      setCheckoutPlan(null)
    }
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Подписка
        </h2>
        <p className="text-sm text-muted-foreground">
          Текущий доступ, тарифы и история подписок.
          {isAdmin
            ? " Как администратор вы выдаёте тарифы вручную."
            : " Оплата онлайн — доступ активируется автоматически после подтверждения."}
        </p>
        {awaitingPayment ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Ожидаем подтверждение платежа…
          </p>
        ) : null}
      </div>

      <PlanStatusBanner showEmptyCta={false} />

      <div className="px-4 lg:px-6">
        <div className="mb-3">
          <h3 className="font-heading text-base font-semibold tracking-tight">
            Тарифы
          </h3>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Выдача пользователям — в разделе «Пользователи»."
              : "Выберите тариф и оплатите — доступ откроется после подтверждения платежа."}
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Загрузка тарифов…</p>
        ) : (
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            {products.map((product) => {
              const isCurrent = me?.activePlans.includes(product.code) ?? false
              const meta = productMeta(product.code)
              const features = meta?.features ?? []
              const checkingOut = checkoutPlan === product.code
              return (
                <Card
                  key={product.code}
                  className={cn(
                    "h-full",
                    isCurrent &&
                      "border-primary/40 bg-linear-to-b from-primary/10 to-card",
                  )}
                >
                  <CardHeader>
                    <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
                      <CardDescription>
                        {meta?.subtitle ?? product.code}
                      </CardDescription>
                      {isCurrent ? (
                        <Badge variant="default">Текущий</Badge>
                      ) : null}
                    </div>
                    <CardTitle className="font-heading text-xl">
                      {meta?.label ?? product.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5">
                    <div>
                      <p className="font-heading text-3xl font-semibold tabular-nums">
                        {product.priceRub.toLocaleString("ru-RU")}₽
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {meta?.period ?? ""}
                      </p>
                    </div>
                    <ul className="flex flex-1 flex-col gap-2">
                      {features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto">
                    {isAdmin ? (
                      isCurrent ? (
                        <Button className="w-full" variant="secondary" disabled>
                          Уже активен
                        </Button>
                      ) : (
                        <Link
                          href="/dashboard/users"
                          className={cn(
                            buttonVariants({ variant: "secondary" }),
                            "w-full",
                          )}
                        >
                          Выдать в «Пользователи»
                        </Link>
                      )
                    ) : isCurrent ? (
                      <Button className="w-full" variant="secondary" disabled>
                        Уже активен
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={checkoutPlan !== null}
                        onClick={() => void handleCheckout(product.code)}
                      >
                        {checkingOut ? "Переход к оплате…" : "Оплатить"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div>
          <h3 className="font-heading text-base font-semibold tracking-tight">
            История подписок
          </h3>
          <p className="text-sm text-muted-foreground">
            Каждый период хранится отдельно — новая подписка не затирает прошлую
            статистику
          </p>
        </div>
        <div className="flex flex-col gap-2 md:hidden">
          {history.length ? (
            history.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border bg-card/40 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{planLabel(item.plan)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Старт {formatDay(item.startsAt)}
                    </p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>
                    {statusLabel(item.status)}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{runDetails(item)}</span>
                  <span className="font-medium tabular-nums">
                    {item.priceRubAtGrant.toLocaleString("ru-RU")}₽
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-24 items-center justify-center rounded-xl border text-sm text-muted-foreground">
              {loading ? "Загрузка…" : "Пока нет подписок"}
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border md:block">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>План</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Старт</TableHead>
                <TableHead>Банк / срок</TableHead>
                <TableHead className="text-right">Цена</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length ? (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {planLabel(item.plan)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDay(item.startsAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {runDetails(item)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.priceRubAtGrant.toLocaleString("ru-RU")}₽
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {loading ? "Загрузка…" : "Пока нет подписок"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
