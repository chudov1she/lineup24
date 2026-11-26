"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { PageIntro } from "@/components/layout/page-frame"
import { TilePattern } from "@/components/motion/tile-pattern"
import { Reveal } from "@/components/motion/reveal"
import { buttonVariants } from "@/components/ui/button"
import { betsApi, type ArchiveBet, type ArchiveResponse } from "@/lib/api"
import { formatLongDate } from "@/lib/datetime"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return formatLongDate(iso)
}

function resultLabel(result: ArchiveBet["result"]) {
  return result === "WON" ? "Выигрыш" : "Проигрыш"
}

export function LiveArchiveBoard() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ArchiveResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void betsApi
      .archive({ page, limit: PAGE_SIZE })
      .then((response) => {
        if (!cancelled) setData(response)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось загрузить архив",
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page])

  const rows: ArchiveBet[] = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const stats = {
    total,
    won: data?.won ?? 0,
    lost: data?.lost ?? 0,
    rate: data?.hitRate ?? 0,
  }

  function goToPage(next: number) {
    const clamped = Math.min(pageCount, Math.max(1, next))
    if (clamped === page) return
    setPage(clamped)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      <Reveal>
        <PageIntro
          kicker="Открытый архив"
          title="Статистика"
          lead="Закрытые прогнозы из рабочей базы: матч, коэффициент, счёт и исход. Актуальная линия — в кабинете после оформления тарифа."
          action={
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 w-full rounded-full bg-ink px-6 text-white hover:bg-ink/90 sm:w-auto",
              )}
            >
              Тарифы
            </Link>
          }
        />
      </Reveal>

      <Reveal delay={80}>
        <div className="bento-ink relative overflow-hidden !p-4 sm:!p-6">
          <TilePattern variant="chart" className="opacity-[0.12]" />
          <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            <Metric
              label="Всего"
              value={String(stats.total)}
              hint="закрытых ставок"
            />
            <Metric
              label="Выигрыши"
              value={String(stats.won)}
              hint="положительный исход"
            />
            <Metric
              label="Проигрыши"
              value={String(stats.lost)}
              hint="отрицательный исход"
            />
            <Metric
              label="Проходимость"
              value={stats.total > 0 ? `${stats.rate}%` : "—"}
              hint="доля выигрышей"
            />
          </div>
        </div>
      </Reveal>

      {error ? (
        <p className="rounded-[1.25rem] border border-[oklch(0.5_0.16_25/0.35)] bg-[oklch(0.62_0.16_25/0.12)] px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-ink/50">Загрузка архива…</p>
      ) : null}

      {data && rows.length === 0 && !loading ? (
        <div className="bento-soft text-center">
          <p className="text-base text-white/70">Архив пока пуст.</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <>
          <ul
            className={cn(
              "grid gap-3 transition-opacity",
              loading ? "opacity-55" : "opacity-100",
            )}
          >
            {rows.map((row, index) => {
              const won = row.result === "WON"
              return (
                <li key={row.id}>
                  <Reveal delay={Math.min(index, 8) * 50} className="h-full">
                    <article
                      className={cn(
                        "rounded-[1.25rem] px-5 py-5 sm:rounded-[1.5rem] sm:px-6",
                        won ? "result-tile-won" : "result-tile-lost",
                      )}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium tracking-[0.12em] text-ink/45 uppercase">
                              {formatDate(row.publishedAt)}
                            </span>
                          </div>
                          <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight text-ink sm:text-xl">
                            {row.title}
                          </h2>
                          <p className="mt-2 text-sm leading-relaxed text-ink/70">
                            Прогноз:{" "}
                            <span className="font-medium text-ink">
                              {row.forecast}
                            </span>
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums text-ink/60">
                            <span>
                              Кэф{" "}
                              <span className="font-semibold text-ink">
                                {row.odds.toFixed(2)}
                              </span>
                            </span>
                            <span>
                              Счёт{" "}
                              <span className="font-semibold text-ink">
                                {row.score || "—"}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 sm:pt-1">
                          <span
                            className={cn(
                              won ? "result-badge-won" : "result-badge-lost",
                            )}
                          >
                            {resultLabel(row.result)}
                          </span>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                </li>
              )
            })}
          </ul>

          {pageCount > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink/55">
                Стр. {page} из {pageCount} · по {PAGE_SIZE} · всего {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-10 rounded-full border-ink/15 px-4 text-ink disabled:opacity-40",
                  )}
                >
                  <ChevronLeft className="size-4" />
                  Назад
                </button>
                <button
                  type="button"
                  disabled={page >= pageCount || loading}
                  onClick={() => goToPage(page + 1)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-10 rounded-full border-ink/15 px-4 text-ink disabled:opacity-40",
                  )}
                >
                  Далее
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div>
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white/45 sm:text-xs">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-white sm:mt-2 sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-white/40 sm:text-sm">{hint}</p>
    </div>
  )
}
