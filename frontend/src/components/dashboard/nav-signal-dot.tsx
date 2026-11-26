"use client"

import { cn } from "@/lib/utils"

export function NavSignalDot({
  className,
  label = "Есть новые сигналы",
}: {
  className?: string
  label?: string
}) {
  return (
    <span
      className={cn("relative flex size-2 shrink-0", className)}
      aria-label={label}
      title={label}
    >
      <span className="absolute inset-0 animate-pulse rounded-full bg-primary/50" />
      <span className="relative inline-flex size-2 rounded-full bg-primary" />
    </span>
  )
}
