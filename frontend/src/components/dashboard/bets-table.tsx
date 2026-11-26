"use client"

import * as React from "react"

import {
  BetDetailDrawer,
  ResultBadge,
} from "@/components/dashboard/bet-detail-drawer"
import { useSignalsActivityOptional } from "@/components/dashboard/signals-activity"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime, type Bet } from "@/lib/api"
import { cn } from "@/lib/utils"

export function BetsTable({
  bets,
  emptyText = "Нет сигналов",
}: {
  bets: Bet[]
  emptyText?: string
}) {
  const [selected, setSelected] = React.useState<Bet | null>(null)
  const signals = useSignalsActivityOptional()

  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {bets.length ? (
          bets.map((bet) => {
            const isOpen = bet.result === "PENDING"
            const isUnseen = signals?.isUnseen(bet) ?? false
            return (
              <button
                key={bet.id}
                type="button"
                onClick={() => setSelected(bet)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-[background-color,box-shadow,border-color] duration-500 ease-out active:bg-muted/60",
                  isUnseen
                    ? "border-primary/50 bg-primary/15 shadow-[inset_3px_0_0_0] shadow-primary ring-1 ring-primary/25 hover:bg-primary/20"
                    : "bg-card/40 hover:bg-muted/50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {isUnseen ? (
                      <p className="animate-pulse text-xs font-semibold tracking-wide text-primary uppercase">
                        Новый сигнал
                      </p>
                    ) : isOpen ? (
                      <p className="text-xs text-muted-foreground">
                        Открытая · {formatDateTime(bet.publishedAt)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(bet.publishedAt)}
                      </p>
                    )}
                    <p className="mt-1 font-medium leading-snug wrap-break-word">
                      {bet.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground wrap-break-word">
                      {bet.forecast}
                    </p>
                    {isUnseen ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(bet.publishedAt)}
                      </p>
                    ) : null}
                  </div>
                  <ResultBadge result={bet.result} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>
                    Кэф{" "}
                    <span className="font-medium tabular-nums">
                      {bet.odds.toFixed(2)}
                    </span>
                  </span>
                  <span>
                    Счёт{" "}
                    <span className="font-medium tabular-nums">
                      {bet.score ?? "—"}
                    </span>
                  </span>
                </div>
              </button>
            )
          })
        ) : (
          <div className="flex h-24 items-center justify-center rounded-xl border text-sm text-muted-foreground">
            {emptyText}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Матч</TableHead>
              <TableHead>Прогноз</TableHead>
              <TableHead className="text-right">Кэф</TableHead>
              <TableHead>Счёт</TableHead>
              <TableHead>Результат</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bets.length ? (
              bets.map((bet) => {
                const isUnseen = signals?.isUnseen(bet) ?? false
                return (
                  <TableRow
                    key={bet.id}
                    className={cn(
                      "cursor-pointer transition-[background-color,box-shadow] duration-500 ease-out hover:bg-muted/50",
                      isUnseen &&
                        "bg-primary/15 hover:bg-primary/20 shadow-[inset_3px_0_0_0] shadow-primary",
                    )}
                    onClick={() => setSelected(bet)}
                  >
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {isUnseen ? (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="animate-pulse text-[10px] font-semibold tracking-wide text-primary uppercase">
                            Новый
                          </span>
                          <span>{formatDateTime(bet.publishedAt)}</span>
                        </span>
                      ) : (
                        formatDateTime(bet.publishedAt)
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 truncate font-medium whitespace-normal">
                      {bet.title}
                    </TableCell>
                    <TableCell className="max-w-48 truncate whitespace-normal">
                      {bet.forecast}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {bet.odds.toFixed(2)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {bet.score ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ResultBadge result={bet.result} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BetDetailDrawer
        bet={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </>
  )
}
