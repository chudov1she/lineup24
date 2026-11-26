"use client"

import { useCallback, useEffect, useRef } from "react"

import { useSignalsActivityOptional } from "@/components/dashboard/signals-activity"
import type { Bet } from "@/lib/api"

/** How long a signal stays highlighted as "new" before counting as viewed. */
export const SIGNALS_SEEN_DELAY_MS = 1_500

/**
 * After visible bets are on screen, wait {@link SIGNALS_SEEN_DELAY_MS} then mark them seen.
 * Reschedules when the visible set changes (e.g. live new signal).
 */
export function useScheduleMarkSignalsSeen(
  bets: Pick<Bet, "id" | "publishedAt">[],
  enabled = true,
) {
  const signals = useSignalsActivityOptional()
  const betsRef = useRef(bets)
  betsRef.current = bets
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const schedule = useCallback(() => {
    if (!signals) return
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      signals.markSeen(betsRef.current)
    }, SIGNALS_SEEN_DELAY_MS)
  }, [signals, clearTimer])

  const betsKey = bets.map((bet) => bet.id).join(",")

  useEffect(() => {
    if (!enabled || !signals || bets.length === 0) {
      clearTimer()
      return
    }
    schedule()
    return clearTimer
  }, [enabled, signals, betsKey, bets.length, schedule, clearTimer])

  return schedule
}
