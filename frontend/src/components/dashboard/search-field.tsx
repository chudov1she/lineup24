"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const DEFAULT_DELAY_MS = 350

export function SearchField({
  value,
  onValueChange,
  onDebouncedChange,
  placeholder,
  delayMs = DEFAULT_DELAY_MS,
  className,
  inputClassName,
}: {
  value: string
  onValueChange: (value: string) => void
  /** Called after idle delay (and immediately on clear). */
  onDebouncedChange?: (value: string) => void
  placeholder?: string
  delayMs?: number
  className?: string
  inputClassName?: string
}) {
  const debouncedRef = React.useRef(onDebouncedChange)
  debouncedRef.current = onDebouncedChange

  React.useEffect(() => {
    if (!debouncedRef.current) return
    const timer = window.setTimeout(() => {
      debouncedRef.current?.(value.trim())
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  function clear() {
    onValueChange("")
    debouncedRef.current?.("")
  }

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "pl-9 [&::-webkit-search-cancel-button]:hidden",
          value ? "pr-9" : undefined,
          inputClassName,
        )}
        type="search"
        autoComplete="off"
        enterKeyHint="search"
      />
      {value ? (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={clear}
          className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
