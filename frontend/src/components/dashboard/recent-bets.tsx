"use client"

import { useEffect, useState } from "react"

import { BetsTable } from "@/components/dashboard/bets-table"
import { useSignalsActivityOptional } from "@/components/dashboard/signals-activity"
import { useScheduleMarkSignalsSeen } from "@/hooks/use-schedule-mark-signals-seen"
import { ApiError, betsApi, type Bet } from "@/lib/api"

export function RecentBets() {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const signals = useSignalsActivityOptional()

  useEffect(() => {
    return signals?.subscribeBetsChanges(() => {
      setReloadToken((n) => n + 1)
    })
  }, [signals])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void betsApi
      .list({ page: 1, limit: 8, period: "30d" })
      .then((res) => {
        if (!cancelled) setBets(res.items)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 403) {
          setBets([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  useScheduleMarkSignalsSeen(bets, !loading && bets.length > 0)

  return (
    <BetsTable
      bets={bets}
      emptyText="Пока пусто — сигналы появятся после оформления подписки"
    />
  )
}
