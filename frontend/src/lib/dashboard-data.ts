import {
  betsApi,
  subscriptionsApi,
  type Bet,
  type SubscriptionMeResponse,
} from "@/lib/api"

export type BankChartRange = "24h" | "7d" | "30d"

export type ChartPoint = {
  date: string
  bank: number
}

export type OverviewKpis = {
  winRate: {
    value: string
    trend: string
    up: boolean
    summary: string
    hint: string
  }
  avgOdds: {
    value: string
    trend: string
    up: boolean
    summary: string
    hint: string
  }
  pending: {
    value: string
    trend: string
    up: boolean
    summary: string
    hint: string
  }
  bank: {
    value: number
    trend: string
    up: boolean
    summary: string
    hint: string
    withCoins: true
  }
}

export async function loadSubscriptionMe(): Promise<SubscriptionMeResponse | null> {
  try {
    return await subscriptionsApi.me()
  } catch {
    return null
  }
}

export async function loadBetsForOverview(limit = 100): Promise<Bet[]> {
  try {
    const data = await betsApi.list({ page: 1, limit, period: "all" })
    return data.items
  } catch {
    return []
  }
}

/** Settled bets for bank chart — same source as homepage archive. */
export async function loadSettledBetsForChart(limit = 200): Promise<Bet[]> {
  try {
    const data = await betsApi.archive({ page: 1, limit })
    return data.items.map((bet) => ({
      id: bet.id,
      title: bet.title,
      forecast: bet.forecast,
      odds: bet.odds,
      score: bet.score,
      comment: null,
      result: bet.result,
      publishedAt: bet.publishedAt,
      createdAt: bet.publishedAt,
      updatedAt: bet.publishedAt,
    }))
  } catch {
    return []
  }
}

const emptyOverviewKpis: OverviewKpis = {
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

/** Active bank row, or latest completed period for archive/stats. */
export function resolveBankSubscription(sub: SubscriptionMeResponse | null) {
  if (!sub) return null
  const active =
    sub.activeSubscriptions.find((s) => s.id.startsWith("admin-lifetime-")) ??
    sub.activeSubscriptions.find((s) => s.bankStartRub != null) ??
    sub.activeSubscriptions.find((s) => s.plan === "BANK_BOOST") ??
    sub.activeSubscriptions[0]
  if (active) return { sub: active, archived: false as const }

  const completed = sub.history.find(
    (s) =>
      s.status === "COMPLETED" &&
      s.bankStartRub != null &&
      s.revokedAt == null,
  )
  if (completed) return { sub: completed, archived: true as const }
  return null
}

export function deriveKpis(
  bets: Bet[],
  sub: SubscriptionMeResponse | null,
): OverviewKpis {
  const bankResolved = resolveBankSubscription(sub)
  if (!sub?.hasActiveSubscription && !bankResolved) {
    return emptyOverviewKpis
  }

  // Signal stats are always global (full feed), not subscription-window scoped.
  // Only the bank curve/balance stays tied to the plan period.
  const settled = bets.filter((b) => b.result === "WON" || b.result === "LOST")
  const won = settled.filter((b) => b.result === "WON").length
  const winRate = settled.length
    ? Math.round((won / settled.length) * 100)
    : 0
  const avgOdds =
    bets.length > 0
      ? bets.reduce((sum, b) => sum + b.odds, 0) / bets.length
      : 0
  const pending = bets.filter((b) => b.result === "PENDING").length
  const bankSub = bankResolved?.sub
  const isAdminBank = Boolean(bankSub?.id.startsWith("admin-lifetime-"))
  const bank = bankSub?.bankCurrentRub ?? null
  const start = bankSub?.bankStartRub ?? null
  const target = bankSub?.bankTargetRub ?? null
  const growth =
    bank != null && start != null && start > 0
      ? Math.round(((bank - start) / start) * 1000) / 10
      : null
  const archived = bankResolved?.archived === true

  return {
    winRate: {
      value: settled.length ? `${winRate}%` : "—",
      trend: settled.length ? `${won}/${settled.length}` : "—",
      up: winRate >= 50,
      summary: "Выигрыши среди закрытых",
      hint: "по всей ленте сигналов",
    },
    avgOdds: {
      value: bets.length ? avgOdds.toFixed(2) : "—",
      trend: bets.length ? `${bets.length}` : "—",
      up: avgOdds >= 1.7,
      summary: "Средний коэффициент сигналов",
      hint: "по всей ленте",
    },
    pending: {
      value: String(pending),
      trend: pending > 0 ? `+${pending}` : "—",
      up: pending > 0,
      summary: "Ждут результата",
      hint: "открыто сейчас",
    },
    bank: {
      value: bank ?? 0,
      trend: growth == null ? "—" : `${growth >= 0 ? "+" : ""}${growth}%`,
      up: growth == null ? true : growth >= 0,
      summary: start != null ? `От старта ${start}` : "Банк прогона",
      hint: isAdminBank
        ? "без лимита"
        : archived
          ? "итог периода"
          : target != null
            ? `цель ${target}`
            : "линия 30 дней",
      withCoins: true,
    },
  }
}

const BANK_STAKE = 50

function rangeToMs(range: BankChartRange): number {
  switch (range) {
    case "24h":
      return 24 * 60 * 60 * 1000
    case "7d":
      return 7 * 24 * 60 * 60 * 1000
    case "30d":
      return 30 * 24 * 60 * 60 * 1000
  }
}

function dayKeyLocal(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Daily bank curve like homepage archive series:
 * walk settled bets chronologically, keep last bank value per day.
 */
export function getBankChartSeries(
  range: BankChartRange,
  bets: Bet[],
  sub: SubscriptionMeResponse | null,
): ChartPoint[] {
  const resolved = resolveBankSubscription(sub)
  const active = resolved?.sub
  if (!active || active.bankStartRub == null) return []

  const isAdminBank = active.id.startsWith("admin-lifetime-")
  const startBank = active.bankStartRub
  const startMs = isAdminBank ? 0 : new Date(active.startsAt).getTime()
  const endMs = resolved?.archived
    ? new Date(
        active.completedAt ?? active.endsAt ?? active.startsAt,
      ).getTime()
    : Number.POSITIVE_INFINITY
  const nowMs = Date.now()
  const rangeFrom = nowMs - rangeToMs(range)

  const settled = bets
    .filter((bet) => {
      if (bet.result !== "WON" && bet.result !== "LOST") return false
      const t = new Date(bet.publishedAt).getTime()
      return t >= startMs && t <= endMs
    })
    .slice()
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))

  if (settled.length === 0) {
    const endIso = Number.isFinite(endMs)
      ? new Date(endMs).toISOString()
      : new Date(nowMs).toISOString()
    return [
      { date: active.startsAt, bank: startBank },
      { date: endIso, bank: active.bankCurrentRub ?? startBank },
    ]
  }

  let bank = startBank
  const byDay = new Map<string, ChartPoint>()
  const firstIso = settled[0]?.publishedAt ?? active.startsAt
  byDay.set(dayKeyLocal(firstIso), {
    date: `${dayKeyLocal(firstIso)}T12:00:00.000`,
    bank: startBank,
  })

  for (const bet of settled) {
    if (bet.result === "WON") {
      bank += BANK_STAKE * (bet.odds - 1)
    } else {
      bank -= BANK_STAKE
    }
    bank = Math.max(0, Math.round(bank))
    const key = dayKeyLocal(bet.publishedAt)
    byDay.set(key, { date: `${key}T12:00:00.000`, bank })
  }

  const full = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => point)

  let anchor: ChartPoint | null = null
  const inRange: ChartPoint[] = []
  for (const point of full) {
    const t = new Date(point.date).getTime()
    if (t < rangeFrom) {
      anchor = point
      continue
    }
    inRange.push(point)
  }

  if (anchor && (inRange.length === 0 || inRange[0]?.date !== anchor.date)) {
    return [
      {
        ...anchor,
        date: new Date(Math.max(rangeFrom, new Date(anchor.date).getTime())).toISOString(),
      },
      ...inRange,
    ]
  }

  return inRange.length > 0 ? inRange : full
}

export { resultLabel } from "@/lib/api"

export function planLabel(plan: "BANK_BOOST" | "MONTHLY") {
  return plan === "BANK_BOOST" ? "Буст банка +30%" : "Линия на 30 дней"
}

export { formatDateTime as formatDate, formatDay } from "@/lib/datetime"
