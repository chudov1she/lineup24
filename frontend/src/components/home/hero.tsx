import Link from "next/link"

import { HeroBackdrop } from "@/components/home/hero-backdrop"
import { buttonVariants } from "@/components/ui/button"
import { site } from "@/data/site"
import { cn } from "@/lib/utils"

export function Hero() {
  return (
    <section className="relative isolate -mt-[3.75rem] h-[calc(110vh+3.75rem)] min-h-[calc(110vh+3.75rem)] overflow-hidden sm:-mt-[5.25rem] sm:h-[calc(110vh+5.25rem)] sm:min-h-[calc(110vh+5.25rem)] md:h-[calc(105vh+5.25rem)] md:min-h-[calc(105vh+5.25rem)]">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <HeroBackdrop />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.14_0.02_260/0.5)_0%,oklch(0.14_0.02_260/0.35)_45%,oklch(0.12_0.02_260/0.78)_100%)] sm:bg-[linear-gradient(105deg,oklch(0.14_0.02_260/0.72)_0%,oklch(0.16_0.02_230/0.48)_50%,oklch(0.2_0.03_220/0.25)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.1_0.02_260/0.4)_0%,oklch(0.1_0.02_260/0.14)_42%,transparent_72%)]" />
      </div>

      <div className="home-pad flex h-[calc(100vh+3.75rem)] w-full flex-col justify-center pt-20 pb-28 sm:h-[calc(100vh+5.25rem)] sm:justify-end sm:pb-16 sm:pt-36 md:justify-center md:pb-32 md:pt-28">
        <div className="relative max-w-3xl text-left text-white">
          <h1
            className="animate-soft-rise max-w-2xl font-display text-[2.1rem] leading-[1.15] tracking-[0.02em] text-white sm:text-5xl sm:leading-[1.08] lg:text-6xl"
            style={{ animationDelay: "40ms" }}
          >
            {site.heroTitle[0]}
            <br />
            {site.heroTitle[1]}
          </h1>
          <p
            className="animate-soft-rise mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:mt-5 sm:text-lg"
            style={{ animationDelay: "120ms" }}
          >
            {site.lead}
          </p>
          <div
            className="animate-soft-rise mt-7 flex w-full flex-col items-stretch gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:flex-wrap sm:items-start"
            style={{ animationDelay: "200ms" }}
          >
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 w-full rounded-full border-0 bg-white px-7 text-ink hover:bg-white/90 sm:w-auto",
              )}
            >
              Выбрать тариф
            </Link>
            <Link
              href="/static"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 w-full rounded-full border-0 bg-ink px-7 text-white hover:bg-ink/90 sm:w-auto",
              )}
            >
              Смотреть статистику
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
