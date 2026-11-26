"use client"

import Link from "next/link"
import { ChartColumn } from "lucide-react"

import { SeasonHitChart } from "@/components/home/season-hit-chart"
import { Reveal } from "@/components/motion/reveal"
import { TilePattern } from "@/components/motion/tile-pattern"
import { buttonVariants } from "@/components/ui/button"
import type { ArchiveSeriesPoint } from "@/lib/public-archive"
import { cn } from "@/lib/utils"

type Metric = {
  label: string
  value: string
  hint: string
}

type WhyAndValueViewProps = {
  metrics: Metric[]
  series: ArchiveSeriesPoint[]
  failed: boolean
}

export function WhyAndValueView({
  metrics,
  series,
  failed,
}: WhyAndValueViewProps) {
  return (
    <section id="why" className="home-section">
      <Reveal offset={36}>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="home-title">Статистика архива</h2>
            <p className="mt-2 max-w-xl text-sm text-ink/60 sm:text-base">
              Закрытые исходы из рабочей базы. Без обещаний прибыли.
            </p>
          </div>
          <Link
            href="/static"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 w-full gap-2 rounded-full bg-ink px-6 text-white hover:bg-ink/90 sm:w-auto",
            )}
          >
            <ChartColumn className="size-4" />
            Полный архив
          </Link>
        </div>
      </Reveal>

      <Reveal delay={120} offset={44} variant="scale">
        <div className="bento-ink relative mt-6 overflow-hidden !p-4 sm:!p-6">
          <TilePattern variant="radar" className="opacity-25" />
          <div className="relative grid grid-cols-2 gap-3 border-b border-white/10 pb-4 sm:grid-cols-4 sm:gap-6 sm:pb-5">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white/40 sm:text-xs">
                  {metric.label}
                </p>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-white sm:mt-2 sm:text-2xl">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-white/40 sm:text-sm">
                  {metric.hint}
                </p>
              </div>
            ))}
          </div>

          <div className="relative mt-5">
            {failed ? (
              <p className="text-sm text-white/50">
                Не удалось загрузить архив. Проверьте API и обновите страницу.
              </p>
            ) : series.length > 0 ? (
              <SeasonHitChart data={series} />
            ) : (
              <p className="text-sm text-white/50">
                В архиве пока нет закрытых ставок — график появится после
                первых исходов.
              </p>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  )
}
