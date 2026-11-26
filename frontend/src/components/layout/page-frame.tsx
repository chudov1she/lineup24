"use client"

import type { ReactNode } from "react"

import { Reveal } from "@/components/motion/reveal"
import { cn } from "@/lib/utils"

/** Shared chrome for inner marketing pages. */
export function PageFrame({
  children,
  className,
  wide,
}: {
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <div className="relative z-10 -mb-12 w-full overflow-hidden rounded-b-[1.5rem] bg-sheet text-ink sm:-mb-20 sm:rounded-b-[2.5rem]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,oklch(0.18_0.012_260/0.06),transparent_70%)]"
      />
      <div
        className={cn(
          "home-pad relative pt-20 pb-14 sm:pt-28 sm:pb-20",
          wide ? "max-w-none" : "",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function PageIntro({
  kicker,
  title,
  lead,
  action,
}: {
  kicker: string
  title: string
  lead?: string
  action?: ReactNode
}) {
  return (
    <Reveal offset={32}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="page-kicker">{kicker}</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            {title}
          </h1>
          {lead ? <p className="page-lead">{lead}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Reveal>
  )
}
