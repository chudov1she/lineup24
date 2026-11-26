"use client"

import Link from "next/link"

import { useAuthSession } from "@/components/auth/auth-session"
import {
  TilePattern,
  type TilePatternVariant,
} from "@/components/motion/tile-pattern"
import { Reveal } from "@/components/motion/reveal"
import { buttonVariants } from "@/components/ui/button"
import { accessBento, site } from "@/data/site"
import { cn } from "@/lib/utils"

const includePatterns: TilePatternVariant[] = [
  "chart",
  "mesh",
  "bars",
  "nodes",
]

export function AccessBento() {
  const { openAuth } = useAuthSession()

  return (
    <section className="home-section">
      <Reveal>
        <h2 className="home-title">{accessBento.title}</h2>
        <p className="mt-2 max-w-xl text-sm text-ink/60 sm:text-base">
          {accessBento.lead}
        </p>
      </Reveal>

      <div className="mt-8 grid gap-3 lg:grid-cols-12 lg:gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
          {accessBento.includes.map((item, index) => (
            <Reveal
              key={item.title}
              delay={60 + index * 70}
              offset={28}
              className="h-full"
            >
              <div className="bento-soft relative h-full overflow-hidden !p-5 sm:!p-6">
                <TilePattern
                  variant={includePatterns[index] ?? "mesh"}
                  className="opacity-[0.11]"
                />
                <h3 className="bento-title relative text-white">{item.title}</h3>
                <p className="bento-copy relative text-white/65">
                  {item.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={140} offset={36} className="lg:col-span-4">
          <div className="bento-ink relative flex h-full flex-col overflow-hidden !p-5 sm:!p-6">
            <TilePattern variant="orbit" className="opacity-[0.1]" />
            <p className="relative text-xs font-semibold tracking-[0.14em] text-white/40 uppercase">
              Подключение
            </p>
            <ol className="relative mt-5 flex flex-1 flex-col gap-5">
              {accessBento.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/12 text-sm font-semibold tabular-nums text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-heading text-base font-semibold text-white">
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal delay={200} offset={40} variant="scale" className="lg:col-span-12">
          <div className="bento-ink relative overflow-hidden lg:flex lg:items-center lg:justify-between lg:gap-10">
            <TilePattern variant="arcs" className="opacity-[0.09]" />
            <div className="relative max-w-2xl">
              <h3 className="font-heading text-xl font-semibold tracking-tight sm:text-3xl">
                {accessBento.ctaTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                {accessBento.ctaText}
              </p>
              <p className="mt-2 text-xs text-white/40">
                {site.disclaimer} {site.age}
              </p>
            </div>
            <div className="relative mt-6 flex w-full flex-col gap-3 sm:mt-0 sm:w-auto sm:flex-row sm:shrink-0">
              <Link
                href="/pricing"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 w-full rounded-full border-0 bg-white px-6 text-ink hover:bg-white/90 sm:w-auto",
                )}
              >
                Тарифы
              </Link>
              <button
                type="button"
                onClick={() => openAuth("register")}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 w-full rounded-full border-white/25 bg-transparent px-6 text-white hover:bg-white/5 hover:text-white sm:w-auto",
                )}
              >
                Создать аккаунт
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
