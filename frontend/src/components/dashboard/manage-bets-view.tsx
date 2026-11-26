"use client"

import * as React from "react"
import { ListFilterIcon, PlusIcon } from "lucide-react"

import { ResultBadge } from "@/components/dashboard/bet-detail-drawer"
import { ManageBetDrawer } from "@/components/dashboard/manage-bet-drawer"
import { SearchField } from "@/components/dashboard/search-field"
import { SiteHeader } from "@/components/site-header"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BET_RESULT_SELECT_ITEMS,
  betsApi,
  formatDateTime,
  type Bet,
  type BetResult,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

type PeriodFilter = "all" | "7d" | "30d" | "90d"

type FiltersState = {
  result: "all" | BetResult
  period: PeriodFilter
}

const emptyFilters: FiltersState = {
  result: "all",
  period: "all",
}

const PERIOD_ITEMS: Array<{ value: PeriodFilter; label: string }> = [
  { value: "all", label: "Все время" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "90d", label: "90 дней" },
]

const RESULT_FILTER_ITEMS: Array<{ value: "all" | BetResult; label: string }> = [
  { value: "all", label: "Все" },
  ...BET_RESULT_SELECT_ITEMS,
]

function activeFilterCount(filters: FiltersState) {
  let count = 0
  if (filters.result !== "all") count += 1
  if (filters.period !== "all") count += 1
  return count
}

export function ManageBetsView() {
  const [q, setQ] = React.useState("")
  const [appliedQ, setAppliedQ] = React.useState("")
  const [filters, setFilters] = React.useState<FiltersState>(emptyFilters)
  const [draftFilters, setDraftFilters] =
    React.useState<FiltersState>(emptyFilters)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [items, setItems] = React.useState<Bet[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [selected, setSelected] = React.useState<Bet | null>(null)

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filterCount = activeFilterCount(filters)

  const loadList = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await betsApi.list({
        page,
        limit: PAGE_SIZE,
        q: appliedQ || undefined,
        result: filters.result === "all" ? undefined : filters.result,
        period: filters.period,
      })
      setItems(response.items)
      setTotal(response.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки")
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [appliedQ, filters, page])

  React.useEffect(() => {
    void loadList()
  }, [loadList])

  function applySearch(next: string) {
    setPage(1)
    setAppliedQ(next)
  }

  function openFilters() {
    setDraftFilters(filters)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setFilters(draftFilters)
    setPage(1)
    setFiltersOpen(false)
  }

  function openCreate() {
    setSelected(null)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  function openEdit(bet: Bet) {
    setSelected(bet)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  return (
    <>
      <SiteHeader
        title="Управление ставками"
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openFilters}
            >
              <ListFilterIcon />
              Фильтры
              {filterCount > 0 ? (
                <Badge variant="secondary" className="ml-0.5">
                  {filterCount}
                </Badge>
              ) : null}
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              <PlusIcon />
              Новый сигнал
            </Button>
          </div>
        }
      />

      <Drawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        showSwipeHandle
        swipeDirection="down"
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Фильтры</DrawerTitle>
            <DrawerDescription>Исход и период публикации</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-2">
            <div className="grid gap-2">
              <Label>Исход</Label>
              <Select
                value={draftFilters.result}
                items={RESULT_FILTER_ITEMS}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "PENDING" ||
                    value === "WON" ||
                    value === "LOST"
                  ) {
                    setDraftFilters((prev) => ({ ...prev, result: value }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESULT_FILTER_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Период</Label>
              <Select
                value={draftFilters.period}
                items={PERIOD_ITEMS}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "7d" ||
                    value === "30d" ||
                    value === "90d"
                  ) {
                    setDraftFilters((prev) => ({ ...prev, period: value }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter>
            <Button type="button" className="w-full" onClick={applyFilters}>
              Применить
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setDraftFilters(emptyFilters)}
            >
              Сбросить
            </Button>
            <DrawerClose
              render={
                <Button type="button" variant="outline" className="w-full" />
              }
            >
              Отмена
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
            <div className="grid grid-cols-2 gap-2 md:hidden">
              <Button type="button" variant="outline" onClick={openFilters}>
                <ListFilterIcon />
                Фильтры
                {filterCount > 0 ? (
                  <Badge variant="secondary" className="ml-0.5">
                    {filterCount}
                  </Badge>
                ) : null}
              </Button>
              <Button type="button" onClick={openCreate}>
                <PlusIcon />
                Новый
              </Button>
            </div>

            <SearchField
              value={q}
              onValueChange={setQ}
              onDebouncedChange={applySearch}
              placeholder="Матч или прогноз"
            />

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {loading ? (
              <p className="text-sm text-muted-foreground">Загрузка…</p>
            ) : null}

            <div className="flex flex-col gap-2 md:hidden">
              {items.length === 0 && !loading ? (
                <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
                  Ставки не найдены
                </p>
              ) : null}
              {items.map((bet) => {
                const isOpen = bet.result === "PENDING"
                return (
                  <button
                    key={bet.id}
                    type="button"
                    onClick={() => openEdit(bet)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors active:bg-muted/60",
                      isOpen
                        ? "border-primary/40 bg-primary/10 shadow-[inset_3px_0_0_0] shadow-primary hover:bg-primary/15"
                        : "bg-card/40 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(bet.publishedAt)}
                        </p>
                        <p className="mt-1 font-medium leading-snug wrap-break-word">
                          {bet.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground wrap-break-word">
                          {bet.forecast}
                        </p>
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
              })}
            </div>

            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Матч</TableHead>
                    <TableHead>Прогноз</TableHead>
                    <TableHead>Кэф</TableHead>
                    <TableHead>Счёт</TableHead>
                    <TableHead>Исход</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Ставки не найдены
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {items.map((bet) => {
                    const isOpen = bet.result === "PENDING"
                    return (
                      <TableRow
                        key={bet.id}
                        className={cn(
                          "cursor-pointer",
                          isOpen && "bg-primary/5",
                        )}
                        onClick={() => openEdit(bet)}
                      >
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(bet.publishedAt)}
                        </TableCell>
                        <TableCell className="max-w-[220px] font-medium wrap-break-word">
                          {bet.title}
                        </TableCell>
                        <TableCell className="max-w-[180px] wrap-break-word">
                          {bet.forecast}
                        </TableCell>
                        <TableCell className="tabular-nums">
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
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {total} · стр. {page} / {pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Назад
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount || loading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Дальше
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ManageBetDrawer
        open={drawerOpen}
        mode={drawerMode}
        bet={selected}
        onOpenChange={setDrawerOpen}
        onChanged={() => void loadList()}
      />
    </>
  )
}
