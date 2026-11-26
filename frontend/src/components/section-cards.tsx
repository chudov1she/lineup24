"use client"

import { useEffect, useState } from "react"

import { BankCoins, formatBank } from "@/components/dashboard/bank-coins"
import { useSignalsActivityOptional } from "@/components/dashboard/signals-activity"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  deriveKpis,
  loadBetsForOverview,
  loadSubscriptionMe,
  type OverviewKpis,
} from "@/lib/dashboard-data"
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const empty: OverviewKpis = {
  winRate: {
    value: "—",
    trend: "—",
    up: true,
    summary: "Выигрыши среди закрытых",
    hint: "появятся после подписки",
  },
  avgOdds: {
    value: "—",
    trend: "—",
    up: true,
    summary: "Средний коэффициент сигналов",
    hint: "появятся после подписки",
  },
  pending: {
    value: "—",
    trend: "—",
    up: true,
    summary: "Ждут результата",
    hint: "появятся после подписки",
  },
  bank: {
    value: 0,
    trend: "—",
    up: true,
    summary: "Банк прогона",
    hint: "нужен активный тариф",
    withCoins: true,
  },
}

export function SectionCards() {
  const [kpis, setKpis] = useState<OverviewKpis>(empty)
  const [reloadToken, setReloadToken] = useState(0)
  const signals = useSignalsActivityOptional()

  useEffect(() => {
    return signals?.subscribeBankChanges(() => {
      setReloadToken((n) => n + 1)
    })
  }, [signals])

  useEffect(() => {
    void (async () => {
      const [sub, bets] = await Promise.all([
        loadSubscriptionMe(),
        loadBetsForOverview(),
      ])
      setKpis(deriveKpis(bets, sub))
    })()
  }, [reloadToken])

  const cards = [
    { key: "winRate", title: "Проходимость", ...kpis.winRate },
    { key: "avgOdds", title: "Средний кэф", ...kpis.avgOdds },
    { key: "pending", title: "Открытых", ...kpis.pending },
    { key: "bank", title: "Банк", ...kpis.bank },
  ] as const

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {cards.map((card) => {
        const Icon = card.up ? TrendingUpIcon : TrendingDownIcon
        const withCoins = "withCoins" in card && card.withCoins
        return (
          <Card key={card.key} className="@container/card">
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle
                className={cn(
                  "text-2xl font-semibold tabular-nums @[250px]/card:text-3xl",
                  (card.value === "—" ||
                    (withCoins &&
                      typeof card.value === "number" &&
                      card.value === 0)) &&
                    "text-muted-foreground",
                )}
              >
                {withCoins &&
                typeof card.value === "number" &&
                card.value > 0 ? (
                  <BankCoins
                    value={card.value}
                    iconClassName="size-5 text-muted-foreground"
                  />
                ) : withCoins && typeof card.value === "number" ? (
                  "—"
                ) : typeof card.value === "number" ? (
                  formatBank(card.value)
                ) : (
                  card.value
                )}
              </CardTitle>
              <CardAction>
                <Badge
                  variant="outline"
                  className={
                    card.trend === "—" ? "text-muted-foreground" : undefined
                  }
                >
                  {card.trend === "—" ? null : <Icon />}
                  {card.trend}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="font-medium">{card.summary}</div>
              <div className="text-muted-foreground">{card.hint}</div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
