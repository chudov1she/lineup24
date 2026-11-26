import { CoinsIcon } from "lucide-react"

import { cn } from "cn"

export function formatBank(value: number) {
  return value.toLocaleString("ru-RU")
}

/** Банк в условных единицах: число + иконка монет (без ₽). */
export function BankCoins({
  value,
  className,
  iconClassName,
}: {
  value: number
  className?: string
  iconClassName?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        className,
      )}
    >
      {formatBank(value)}
      <CoinsIcon
        className={cn("size-3.5 shrink-0 text-muted-foreground", iconClassName)}
        aria-hidden
      />
      <span className="sr-only">усл. ед.</span>
    </span>
  )
}
