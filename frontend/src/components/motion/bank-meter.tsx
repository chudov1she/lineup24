"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

/** Animated bank progress 1000 → 1300 for the primary plan. */
export function BankMeter({
  className,
  light = false,
}: {
  className?: string
  light?: boolean
}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches) {
      setProgress(0.72)
      return
    }
    const id = window.setTimeout(() => setProgress(0.72), 180)
    return () => window.clearTimeout(id)
  }, [])

  const current = Math.round(1000 + progress * 300)

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end justify-between gap-3 text-xs tabular-nums">
        <span className={light ? "text-white/45" : "text-ink/45"}>1000</span>
        <span
          className={cn(
            "font-semibold tracking-tight",
            light ? "text-white" : "text-ink",
          )}
        >
          {current}
          <span className={light ? "text-white/45" : "text-ink/45"}> / 1300</span>
        </span>
        <span className={light ? "text-white/45" : "text-ink/45"}>+30%</span>
      </div>
      <div
        className={cn(
          "mt-2 h-2 overflow-hidden rounded-full",
          light ? "bg-white/15" : "bg-ink/10",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)]",
            light
              ? "bg-gradient-to-r from-white/70 to-white"
              : "bg-gradient-to-r from-ink/70 to-ink",
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <svg
        aria-hidden
        viewBox="0 0 280 48"
        className="mt-3 h-10 w-full overflow-visible"
      >
        <defs>
          <linearGradient id="bankStroke" x1="0" y1="0" x2="1" y2="0">
            <stop
              offset="0%"
              stopColor={light ? "rgba(255,255,255,0.25)" : "oklch(0.18 0.012 260 / 0.25)"}
            />
            <stop
              offset="100%"
              stopColor={light ? "rgba(255,255,255,0.85)" : "oklch(0.18 0.012 260)"}
            />
          </linearGradient>
        </defs>
        <path
          d="M4 36 C 40 36, 48 12, 90 12 S 140 40, 180 28 S 230 8, 276 8"
          fill="none"
          stroke="url(#bankStroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
          className="transition-[stroke-dashoffset] duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
        <circle
          cx={4 + progress * 272}
          cy={36 - progress * 28}
          r="4"
          fill={light ? "white" : "oklch(0.18 0.012 260)"}
          className="animate-pulse-dot"
        />
      </svg>
    </div>
  )
}
