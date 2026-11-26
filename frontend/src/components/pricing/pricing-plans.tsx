"use client"

import { useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"

import { useAuthSession } from "@/components/auth/auth-session"
import {
  TilePattern,
  type TilePatternVariant,
} from "@/components/motion/tile-pattern"
import { Reveal } from "@/components/motion/reveal"
import { buttonVariants } from "@/components/ui/button"
import { plans as fallbackPlans, site } from "@/data/site"
import {
  subscriptionsApi,
  type SubscriptionPlan,
  type SubscriptionProduct,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const planPatterns: Record<string, TilePatternVariant> = {
  BANK_BOOST: "nodes",
  MONTHLY: "orbit",
}

function formatPrice(priceRub: number) {
  return `${priceRub.toLocaleString("ru-RU")} ₽`
}

export function PricingPlans() {
  const { openAuth } = useAuthSession()
  const [products, setProducts] = useState<SubscriptionProduct[] | null>(null)

  useEffect(() => {
    void subscriptionsApi
      .products()
      .then(setProducts)
      .catch(() => setProducts(null))
  }, [])

  const cards = useMemo(() => {
    const mapped = fallbackPlans.map((plan) => {
      const fromApi = products?.find((p) => p.code === plan.code)
      return {
        ...plan,
        price: fromApi ? formatPrice(fromApi.priceRub) : plan.price,
      }
    })
    return mapped.sort((a, b) => Number(b.featured) - Number(a.featured))
  }, [products])

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <ul className="grid gap-4 md:grid-cols-2 lg:gap-5">
        {cards.map((plan, index) => {
          const featured = plan.featured
          return (
            <li key={plan.code}>
              <Reveal delay={index * 100} className="h-full">
                <div className="bento-ink relative flex h-full flex-col overflow-hidden !p-5 sm:!p-8">
                  <TilePattern
                    variant={planPatterns[plan.code] ?? "mesh"}
                    className="opacity-[0.1]"
                  />

                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.14em] text-white/40 uppercase">
                        {plan.subtitle}
                      </p>
                      <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight text-white sm:text-2xl">
                        {plan.label}
                      </h2>
                    </div>
                    {plan.badge ? (
                      <span className="shrink-0 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>

                  <p className="relative mt-6 text-3xl font-semibold tabular-nums tracking-tight text-white sm:mt-8 sm:text-4xl">
                    {plan.price}
                  </p>
                  <p className="relative mt-1 text-sm text-white/45">
                    {plan.period}
                  </p>

                  <p className="relative mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
                    {plan.description}
                  </p>

                  <ul className="relative mt-8 flex flex-1 flex-col gap-3">
                    {plan.features.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-sm leading-snug text-white/75"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-white/45" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() =>
                      openAuth("register", plan.code as SubscriptionPlan)
                    }
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "relative mt-8 h-11 w-full rounded-full border-0 sm:mt-10",
                      featured
                        ? "bg-white text-ink hover:bg-white/90"
                        : "border border-white/20 bg-white/10 text-white hover:bg-white/15",
                    )}
                  >
                    Подключить · {plan.label}
                  </button>
                </div>
              </Reveal>
            </li>
          )
        })}
      </ul>

      <p className="text-sm leading-relaxed text-ink/55">
        Архив закрытых ставок открыт без тарифа. Вопросы:{" "}
        <a
          className="font-medium text-ink underline underline-offset-4"
          href={`mailto:${site.email}`}
        >
          {site.email}
        </a>
        .
      </p>
    </div>
  )
}
