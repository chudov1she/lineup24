"use client"

import * as React from "react"
import Link from "next/link"

import { BetsTable } from "@/components/dashboard/bets-table"
import { SearchField } from "@/components/dashboard/search-field"
import { useSignalsActivity } from "@/components/dashboard/signals-activity"
import { SiteHeader } from "@/components/site-header"
import { useScheduleMarkSignalsSeen } from "@/hooks/use-schedule-mark-signals-seen"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ApiError,
  betsApi,
  type ArchiveBet,
  type Bet,
  type BetResult,
} from "@/lib/api"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

const PAGE_SIZE = 15

type StatusFilter = "ALL" | BetResult
type PeriodFilter = (typeof PERIOD_ITEMS)[number]["value"]

const STATUS_ITEMS = [
  { value: "ALL", label: "Все статусы" },
  { value: "PENDING", label: "Новые" },
  { value: "WON", label: "Выигрыш" },
  { value: "LOST", label: "Проигрыш" },
] as const

const ARCHIVE_STATUS_ITEMS = [
  { value: "ALL", label: "Все статусы" },
  { value: "WON", label: "Выигрыш" },
  { value: "LOST", label: "Проигрыш" },
] as const

const PERIOD_ITEMS = [
  { value: "all", label: "Весь период" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
] as const

function archiveToBet(bet: ArchiveBet): Bet {
  return {
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
  }
}

function LiveSummary({
  pending,
  won,
  lost,
  hitRate,
}: {
  pending: number
  won: number
  lost: number
  hitRate: number
}) {
  const items = [
    { label: "Открытых", value: String(pending) },
    { label: "Выигрышей", value: String(won) },
    { label: "Проигрышей", value: String(lost) },
    { label: "% выигрышных", value: `${hitRate}%` },
  ]

  return <SummaryGrid items={items} />
}

function ArchiveSummary({
  total,
  won,
  lost,
  hitRate,
}: {
  total: number
  won: number
  lost: number
  hitRate: number
}) {
  const items = [
    { label: "В архиве", value: String(total) },
    { label: "Выигрышей", value: String(won) },
    { label: "Проигрышей", value: String(lost) },
    { label: "Проходимость", value: `${hitRate}%` },
  ]

  return <SummaryGrid items={items} />
}

function SummaryGrid({
  items,
}: {
  items: { label: string; value: string }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-3 @3xl/main:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border bg-card/40 px-4 py-3"
        >
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 font-heading text-xl font-semibold tracking-tight tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function ArchiveBanner() {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-dashed border-primary/25 bg-linear-to-br from-primary/10 via-muted/30 to-card px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-10">
      <div className="min-w-0 max-w-2xl">
        <p className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Показан публичный архив
        </p>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Актуальные и открытые сигналы появятся после оформления подписки.
        </p>
      </div>
      <Button
        size="lg"
        render={<Link href="/dashboard/subscription" />}
        nativeButton={false}
        className="h-12 shrink-0 rounded-full px-8 text-base"
      >
        Выбрать тариф
      </Button>
    </div>
  )
}

export default function SignalsPage() {
  const { subscribeNewBets, subscribeBetsChanges } = useSignalsActivity()
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("ALL")
  const [period, setPeriod] = React.useState<PeriodFilter>("all")
  const [page, setPage] = React.useState(1)
  const [items, setItems] = React.useState<Bet[]>([])
  const [total, setTotal] = React.useState(0)
  const [archiveStats, setArchiveStats] = React.useState({
    won: 0,
    lost: 0,
    hitRate: 0,
  })
  /** Global feed stats — independent of page / period / status filters. */
  const [liveStats, setLiveStats] = React.useState({
    pending: 0,
    won: 0,
    lost: 0,
    hitRate: 0,
  })
  const [statsReloadToken, setStatsReloadToken] = React.useState(0)
  const [archiveOnly, setArchiveOnly] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const statusRef = React.useRef(status)
  const pageRef = React.useRef(page)
  const archiveOnlyRef = React.useRef(archiveOnly)
  const itemsRef = React.useRef(items)
  React.useEffect(() => {
    statusRef.current = status
  }, [status])
  React.useEffect(() => {
    pageRef.current = page
  }, [page])
  React.useEffect(() => {
    archiveOnlyRef.current = archiveOnly
  }, [archiveOnly])
  React.useEffect(() => {
    itemsRef.current = items
  }, [items])

  const loadKey = archiveOnly
    ? `archive:${page}`
    : `live:${page}:${status}:${period}`

  useScheduleMarkSignalsSeen(
    items,
    !loading && !archiveOnly && items.length > 0,
  )

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function loadArchive() {
      const response = await betsApi.archive({ page, limit: PAGE_SIZE })
      if (cancelled) return
      setItems(response.items.map(archiveToBet))
      setTotal(response.total)
      setArchiveStats({
        won: response.won,
        lost: response.lost,
        hitRate: response.hitRate,
      })
      setStatus((prev) => (prev === "PENDING" ? "ALL" : prev))
    }

    void (async () => {
      let switchingToArchive = false
      try {
        if (archiveOnly) {
          await loadArchive()
          return
        }
        const response = await betsApi.list({
          page,
          limit: PAGE_SIZE,
          result: status === "ALL" ? undefined : status,
          period,
        })
        if (cancelled) return
        setItems(response.items)
        setTotal(response.total)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) {
          switchingToArchive = true
          setArchiveOnly(true)
          return
        }
        setError(
          err instanceof ApiError ? err.message : "Не удалось загрузить сигналы",
        )
      } finally {
        if (!cancelled && !switchingToArchive) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // loadKey encodes page/filters; archiveOnly flips after 403 → archive fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional key
  }, [loadKey, archiveOnly])

  React.useEffect(() => {
    if (archiveOnly) return
    let cancelled = false

    void (async () => {
      try {
        const [archive, pending] = await Promise.all([
          betsApi.archive({ page: 1, limit: 1 }),
          betsApi.list({
            page: 1,
            limit: 1,
            result: "PENDING",
            period: "all",
          }),
        ])
        if (cancelled) return
        setLiveStats({
          pending: pending.total,
          won: archive.won,
          lost: archive.lost,
          hitRate: archive.hitRate,
        })
        setArchiveStats({
          won: archive.won,
          lost: archive.lost,
          hitRate: archive.hitRate,
        })
      } catch {
        // list 403 → archive mode handled elsewhere; keep last known stats
      }
    })()

    return () => {
      cancelled = true
    }
  }, [archiveOnly, statsReloadToken])

  React.useEffect(() => {
    return subscribeBetsChanges(() => {
      setStatsReloadToken((n) => n + 1)
    })
  }, [subscribeBetsChanges])

  React.useEffect(() => {
    return subscribeNewBets((incoming) => {
      if (archiveOnlyRef.current) return
      if (pageRef.current !== 1) return
      const filter = statusRef.current
      const matching = incoming.filter((bet) => {
        if (filter === "ALL") return true
        return bet.result === filter
      })
      if (matching.length === 0) return

      const already = new Set(itemsRef.current.map((bet) => bet.id))
      const fresh = matching.filter((bet) => !already.has(bet.id))
      if (fresh.length === 0) return

      setItems((prev) => [...fresh, ...prev].slice(0, PAGE_SIZE))
      setTotal((prev) => prev + fresh.length)
      // scheduleMarkSeen re-runs via betsKey when items update
    })
  }, [subscribeNewBets])

  React.useEffect(() => {
    return subscribeBetsChanges(({ updated, deletedIds }) => {
      if (archiveOnlyRef.current) return
      if (deletedIds.length > 0) {
        const gone = new Set(deletedIds)
        setItems((prev) => prev.filter((bet) => !gone.has(bet.id)))
        setTotal((prev) => Math.max(0, prev - deletedIds.length))
      }
      if (updated.length === 0) return
      const filter = statusRef.current
      setItems((prev) => {
        const byId = new Map(updated.map((bet) => [bet.id, bet]))
        return prev
          .map((bet) => byId.get(bet.id) ?? bet)
          .filter((bet) => {
            if (filter === "ALL") return true
            return bet.result === filter
          })
      })
    })
  }, [subscribeBetsChanges])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((bet) => {
      if (archiveOnly && status !== "ALL" && bet.result !== status) {
        return false
      }
      if (!q) return true
      return (
        bet.title.toLowerCase().includes(q) ||
        bet.forecast.toLowerCase().includes(q) ||
        (bet.comment?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [items, query, archiveOnly, status])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const statusItems = archiveOnly ? ARCHIVE_STATUS_ITEMS : STATUS_ITEMS

  React.useEffect(() => {
    setPage(1)
  }, [status, period])

  return (
    <>
      <SiteHeader title="Сигналы" />
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {archiveOnly ? "Архив сигналов" : "Все сигналы"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {archiveOnly
              ? `Закрытые прогнозы · ${total} всего`
              : `Открытые и закрытые прогнозы · ${total} всего`}
          </p>
        </div>

        {archiveOnly ? <ArchiveBanner /> : null}

        {archiveOnly ? (
          <ArchiveSummary
            total={archiveStats.won + archiveStats.lost}
            won={archiveStats.won}
            lost={archiveStats.lost}
            hitRate={archiveStats.hitRate}
          />
        ) : (
          <LiveSummary
            pending={liveStats.pending}
            won={liveStats.won}
            lost={liveStats.lost}
            hitRate={liveStats.hitRate}
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchField
            value={query}
            onValueChange={setQuery}
            placeholder="Поиск по матчу или прогнозу"
            className="sm:max-w-sm"
            inputClassName="h-8"
          />
          <Select
            value={status}
            items={[...statusItems]}
            onValueChange={(value) => {
              if (
                value === "ALL" ||
                value === "WON" ||
                value === "LOST" ||
                (!archiveOnly && value === "PENDING")
              ) {
                setStatus(value)
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-44" size="sm">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {archiveOnly ? null : (
            <Select
              value={period}
              items={[...PERIOD_ITEMS]}
              onValueChange={(value) => {
                if (value === "all" || value === "7d" || value === "30d") {
                  setPeriod(value)
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-40" size="sm">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <BetsTable
            bets={filtered}
            emptyText="По фильтру ничего не найдено"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Стр. {page} из {pageCount} · по {PAGE_SIZE}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Далее
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
