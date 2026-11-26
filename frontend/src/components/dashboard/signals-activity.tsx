"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

import { useAuthSession } from "@/components/auth/auth-session"
import { toast } from "@/components/ui/toast"
import { ApiError, betsApi, type Bet } from "@/lib/api"
import {
  getSignalsLastSeenAt,
  setSignalsLastSeenAt,
} from "@/lib/signals-seen"

type NewBetsListener = (bets: Bet[]) => void
type BankChangeListener = () => void
type BetsChangeListener = (payload: {
  created: Bet[]
  updated: Bet[]
  deletedIds: string[]
}) => void

type SignalsActivityContextValue = {
  hasUnseen: boolean
  unseenIds: ReadonlySet<string>
  isUnseen: (bet: Pick<Bet, "id" | "publishedAt">) => boolean
  markSeen: (visibleBets?: Pick<Bet, "id" | "publishedAt">[]) => void
  markBetSeen: (id: string) => void
  subscribeNewBets: (listener: NewBetsListener) => () => void
  /** Live bank / chart — fires on settle updates via long poll. */
  subscribeBankChanges: (listener: BankChangeListener) => () => void
  subscribeBetsChanges: (listener: BetsChangeListener) => () => void
  refresh: () => Promise<void>
}

const SignalsActivityContext =
  createContext<SignalsActivityContextValue | null>(null)

const WATCH_TIMEOUT_MS = 25_000
const BACKOFF_START_MS = 2_000
const BACKOFF_MAX_MS = 30_000

function maxIsoMs(bets: Pick<Bet, "publishedAt" | "updatedAt">[]): number {
  let max = 0
  for (const bet of bets) {
    for (const raw of [bet.updatedAt, bet.publishedAt]) {
      const ts = new Date(raw).getTime()
      if (Number.isFinite(ts) && ts > max) max = ts
    }
  }
  return max
}

function maxPublishedMs(bets: Pick<Bet, "publishedAt">[]): number {
  let max = 0
  for (const bet of bets) {
    const ts = new Date(bet.publishedAt).getTime()
    if (Number.isFinite(ts) && ts > max) max = ts
  }
  return max
}

export function SignalsActivityProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthSession()
  const pathname = usePathname()
  const onSignalsPage = pathname?.startsWith("/dashboard/signals") ?? false
  const onOverviewPage = pathname === "/dashboard" || pathname === "/dashboard/"

  const [lastSeenAt, setLastSeenAt] = useState(() => getSignalsLastSeenAt())
  const [unseenIds, setUnseenIds] = useState<Set<string>>(() => new Set())
  // Delivery cursor ≠ lastSeenAt: start at "now" so reload does not re-toast old bets.
  const [cursorSince, setCursorSince] = useState(() => new Date().toISOString())

  const listenersRef = useRef(new Set<NewBetsListener>())
  const bankListenersRef = useRef(new Set<BankChangeListener>())
  const betsChangeListenersRef = useRef(new Set<BetsChangeListener>())
  const cursorRef = useRef(cursorSince)
  const onSignalsPageRef = useRef(onSignalsPage)
  const lastSeenAtRef = useRef(lastSeenAt)

  useEffect(() => {
    cursorRef.current = cursorSince
  }, [cursorSince])

  useEffect(() => {
    onSignalsPageRef.current = onSignalsPage
  }, [onSignalsPage])

  useEffect(() => {
    lastSeenAtRef.current = lastSeenAt
  }, [lastSeenAt])

  const hasUnseen = useMemo(() => {
    // Hide nav badge while viewing lists that already show the highlight.
    if (onSignalsPage || onOverviewPage) return false
    if (unseenIds.size > 0) return true
    return false
  }, [onSignalsPage, onOverviewPage, unseenIds])

  const isUnseen = useCallback(
    (bet: Pick<Bet, "id" | "publishedAt">) => {
      if (unseenIds.has(bet.id)) return true
      const published = new Date(bet.publishedAt).getTime()
      return Number.isFinite(published) && published > lastSeenAt
    },
    [unseenIds, lastSeenAt],
  )

  const markSeen = useCallback(
    (visibleBets?: Pick<Bet, "id" | "publishedAt">[]) => {
      const fromVisible = visibleBets ? maxPublishedMs(visibleBets) : 0
      const prev = lastSeenAtRef.current
      const next = Math.max(Date.now(), fromVisible, prev)

      // Avoid setState when nothing meaningful changed — prevents render loops
      // when callers depend on a stable markSeen identity.
      if (next > prev) {
        lastSeenAtRef.current = next
        setSignalsLastSeenAt(next)
        setLastSeenAt(next)
      }
      setUnseenIds((ids) => (ids.size === 0 ? ids : new Set()))
      if (fromVisible > 0) {
        const iso = new Date(fromVisible).toISOString()
        setCursorSince((cursor) =>
          new Date(iso).getTime() > new Date(cursor).getTime() ? iso : cursor,
        )
      }
    },
    [],
  )

  const markBetSeen = useCallback((id: string) => {
    setUnseenIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const subscribeNewBets = useCallback((listener: NewBetsListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const subscribeBankChanges = useCallback((listener: BankChangeListener) => {
    bankListenersRef.current.add(listener)
    return () => {
      bankListenersRef.current.delete(listener)
    }
  }, [])

  const subscribeBetsChanges = useCallback((listener: BetsChangeListener) => {
    betsChangeListenersRef.current.add(listener)
    return () => {
      betsChangeListenersRef.current.delete(listener)
    }
  }, [])

  const advanceCursor = useCallback((iso: string) => {
    setCursorSince((prev) =>
      new Date(iso).getTime() > new Date(prev).getTime() ? iso : prev,
    )
    if (new Date(iso).getTime() > new Date(cursorRef.current).getTime()) {
      cursorRef.current = iso
    }
  }, [])

  const notifyBank = useCallback(() => {
    for (const listener of bankListenersRef.current) {
      try {
        listener()
      } catch {
        // ignore
      }
    }
  }, [])

  const ingestWatch = useCallback(
    (payload: {
      items: Bet[]
      updated: Bet[]
      deletedIds: string[]
      bankRevision: string | null
    }) => {
      const { items, updated, deletedIds, bankRevision } = payload
      const all = [...items, ...updated]
      const maxMs = maxIsoMs(all)
      if (maxMs > 0) {
        advanceCursor(new Date(maxMs).toISOString())
      }
      if (bankRevision) {
        advanceCursor(bankRevision)
      }

      if (
        items.length > 0 ||
        updated.length > 0 ||
        deletedIds.length > 0
      ) {
        for (const listener of betsChangeListenersRef.current) {
          try {
            listener({ created: items, updated, deletedIds })
          } catch {
            // ignore
          }
        }
      }

      if (items.length > 0) {
        setUnseenIds((prev) => {
          const next = new Set(prev)
          for (const bet of items) next.add(bet.id)
          return next
        })

        for (const listener of listenersRef.current) {
          try {
            listener(items)
          } catch {
            // ignore listener errors
          }
        }

        const first = items[0]
        if (first) {
          toast.add({
            title: "Новый сигнал",
            description: first.title,
            type: "info",
          })
        }
      }

      const settledUpdate = updated.some(
        (bet) => bet.result === "WON" || bet.result === "LOST",
      )
      if (settledUpdate || bankRevision || deletedIds.length > 0) {
        notifyBank()
      }
    },
    [advanceCursor, notifyBank],
  )

  const refresh = useCallback(async () => {
    if (!user) {
      setUnseenIds(new Set())
      return
    }

    try {
      const response = await betsApi.list({
        page: 1,
        limit: 30,
        result: "PENDING",
      })
      const seen = getSignalsLastSeenAt()
      setLastSeenAt(seen)
      const nextUnseen = new Set<string>()
      for (const bet of response.items) {
        if (new Date(bet.publishedAt).getTime() > seen) {
          nextUnseen.add(bet.id)
        }
      }
      setUnseenIds(nextUnseen)

      const maxMs = maxIsoMs(response.items)
      if (maxMs > 0) {
        advanceCursor(new Date(maxMs).toISOString())
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        setUnseenIds(new Set())
        return
      }
    }
  }, [user, advanceCursor])

  useEffect(() => {
    if (loading || !user) return

    void refresh()

    let cancelled = false
    let backoff = BACKOFF_START_MS
    const ac = new AbortController()

    async function loop() {
      while (!cancelled) {
        try {
          const response = await betsApi.watch(
            { since: cursorRef.current, timeoutMs: WATCH_TIMEOUT_MS },
            { signal: ac.signal },
          )
          if (cancelled) return
          backoff = BACKOFF_START_MS
          ingestWatch({
            items: response.items ?? [],
            updated: response.updated ?? [],
            deletedIds: response.deletedIds ?? [],
            bankRevision: response.bankRevision ?? null,
          })
        } catch (err) {
          if (cancelled || ac.signal.aborted) return
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            setUnseenIds(new Set())
            return
          }
          await new Promise((resolve) => window.setTimeout(resolve, backoff))
          backoff = Math.min(backoff * 2, BACKOFF_MAX_MS)
        }
      }
    }

    void loop()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [loading, user, refresh, ingestWatch])

  const value = useMemo(
    () => ({
      hasUnseen,
      unseenIds,
      isUnseen,
      markSeen,
      markBetSeen,
      subscribeNewBets,
      subscribeBankChanges,
      subscribeBetsChanges,
      refresh,
    }),
    [
      hasUnseen,
      unseenIds,
      isUnseen,
      markSeen,
      markBetSeen,
      subscribeNewBets,
      subscribeBankChanges,
      subscribeBetsChanges,
      refresh,
    ],
  )

  return (
    <SignalsActivityContext.Provider value={value}>
      {children}
    </SignalsActivityContext.Provider>
  )
}

export function useSignalsActivity() {
  const context = useContext(SignalsActivityContext)
  if (!context) {
    throw new Error(
      "useSignalsActivity must be used within SignalsActivityProvider",
    )
  }
  return context
}

/** Safe for optional use outside provider (no-op). */
export function useSignalsActivityOptional() {
  return useContext(SignalsActivityContext)
}
