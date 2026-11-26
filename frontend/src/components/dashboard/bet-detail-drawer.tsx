"use client"

import type * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import {
  formatDateTime,
  resultLabel,
  type Bet,
  type BetResult,
} from "@/lib/api"

export function ResultBadge({ result }: { result: BetResult }) {
  if (result === "PENDING") {
    return (
      <Badge
        variant="default"
        className="gap-1.5 bg-primary text-primary-foreground"
      >
        <span
          aria-hidden
          className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary-foreground"
        />
        {resultLabel(result)}
      </Badge>
    )
  }

  if (result === "WON") {
    return <span className="result-badge-won">{resultLabel(result)}</span>
  }

  return <Badge variant="destructive">{resultLabel(result)}</Badge>
}

function Metric({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-h-6 text-sm font-medium">{children}</div>
    </div>
  )
}

function BetDetailBody({ bet }: { bet: Bet }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-linear-to-br from-primary/10 via-card to-card p-4">
        <p className="text-xs text-muted-foreground">Прогноз</p>
        <p className="mt-1 font-heading text-xl font-semibold tracking-tight">
          {bet.forecast}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ResultBadge result={bet.result} />
          <span className="text-sm text-muted-foreground">
            кэф{" "}
            <span className="font-medium text-foreground tabular-nums">
              {bet.odds.toFixed(2)}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Счёт">
          <span className="tabular-nums">{bet.score ?? "ещё нет"}</span>
        </Metric>
        <Metric label="Статус">
          <ResultBadge result={bet.result} />
        </Metric>
        <Metric label="Опубликован">
          <span className="text-pretty">{formatDateTime(bet.publishedAt)}</span>
        </Metric>
        <Metric label="Коэффициент">
          <span className="tabular-nums">{bet.odds.toFixed(2)}</span>
        </Metric>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Комментарий</p>
        {bet.comment ? (
          <div className="rounded-xl border bg-card/50 px-3.5 py-3">
            <p className="text-sm leading-relaxed text-pretty whitespace-pre-wrap text-muted-foreground">
              {bet.comment}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            К этому сигналу комментарий не добавлен.
          </p>
        )}
      </div>
    </div>
  )
}

export function BetDetailDrawer({
  bet,
  open,
  onOpenChange,
}: {
  bet: Bet | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isMobile = useIsMobile()

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerContent>
        {bet ? (
          <>
            <DrawerHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <DrawerTitle className="text-left">{bet.title}</DrawerTitle>
                <ResultBadge result={bet.result} />
              </div>
              <DrawerDescription className="text-left">
                Детали сигнала · {formatDateTime(bet.publishedAt)}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 scroll-fade overflow-y-auto p-4">
              <BetDetailBody bet={bet} />
            </div>
            <DrawerFooter>
              <DrawerClose render={<Button variant="outline">Закрыть</Button>} />
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
