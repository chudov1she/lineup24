"use client"

import * as React from "react"
import { ListFilterIcon, PlusIcon } from "lucide-react"

import { BroadcastDetailDrawer } from "@/components/dashboard/broadcast-detail-drawer"
import { CreateBroadcastDrawer } from "@/components/dashboard/create-broadcast-drawer"
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
  audienceLabel,
  formatDateTime,
  MASS_AUDIENCE_SELECT_ITEMS,
  notificationsApi,
  type Broadcast,
  type MassBroadcastAudience,
} from "@/lib/api"
import { cn } from "@/lib/utils"

type KindFilter = "all" | "mass" | "direct"

type FiltersState = {
  kind: KindFilter
  audience: "all" | MassBroadcastAudience
}

const emptyFilters: FiltersState = {
  kind: "all",
  audience: "all",
}

const KIND_ITEMS: Array<{ value: KindFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "mass", label: "Массовые" },
  { value: "direct", label: "Личные" },
]

const AUDIENCE_FILTER_ITEMS: Array<{
  value: "all" | MassBroadcastAudience
  label: string
}> = [{ value: "all", label: "Все" }, ...MASS_AUDIENCE_SELECT_ITEMS]

function activeFilterCount(filters: FiltersState) {
  let count = 0
  if (filters.kind !== "all") count += 1
  if (filters.audience !== "all") count += 1
  return count
}

export function BroadcastsView() {
  const [q, setQ] = React.useState("")
  const [appliedQ, setAppliedQ] = React.useState("")
  const [filters, setFilters] = React.useState<FiltersState>(emptyFilters)
  const [draftFilters, setDraftFilters] =
    React.useState<FiltersState>(emptyFilters)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [items, setItems] = React.useState<Broadcast[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Broadcast | null>(null)

  const filterCount = activeFilterCount(filters)

  const loadList = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await notificationsApi.listBroadcasts({
        q: appliedQ || undefined,
        kind: filters.kind,
        audience:
          filters.kind === "direct" || filters.audience === "all"
            ? undefined
            : filters.audience,
      })
      setItems(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [appliedQ, filters])

  React.useEffect(() => {
    void loadList()
  }, [loadList])

  function applySearch(next: string) {
    setAppliedQ(next)
  }

  function openFilters() {
    setDraftFilters(filters)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setFilters(draftFilters)
    setFiltersOpen(false)
  }

  function openDetail(broadcast: Broadcast) {
    setSelected(broadcast)
    setDetailOpen(true)
  }

  return (
    <>
      <SiteHeader
        title="Рассылки"
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
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Новая рассылка
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
            <DrawerDescription>Тип и аудитория</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-2">
            <div className="grid gap-2">
              <Label>Вид</Label>
              <Select
                value={draftFilters.kind}
                items={KIND_ITEMS}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "mass" ||
                    value === "direct"
                  ) {
                    setDraftFilters((prev) => ({
                      ...prev,
                      kind: value,
                      audience: value === "direct" ? "all" : prev.audience,
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Аудитория</Label>
              <Select
                value={draftFilters.audience}
                items={AUDIENCE_FILTER_ITEMS}
                disabled={draftFilters.kind === "direct"}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "ACTIVE_SUBSCRIBERS" ||
                    value === "EMAIL_OPTED_IN" ||
                    value === "TELEGRAM_OPTED_IN"
                  ) {
                    setDraftFilters((prev) => ({ ...prev, audience: value }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_FILTER_ITEMS.map((item) => (
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
              <Button
                type="button"
                variant="outline"
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
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <PlusIcon />
                Новая
              </Button>
            </div>

            <SearchField
              value={q}
              onValueChange={setQ}
              onDebouncedChange={applySearch}
              placeholder="Заголовок или текст"
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
                  Рассылки не найдены
                </p>
              ) : null}
              {items.map((broadcast) => {
                const isDirect = broadcast.audience === "DIRECT_USER"
                return (
                  <button
                    key={broadcast.id}
                    type="button"
                    onClick={() => openDetail(broadcast)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors active:bg-muted/60",
                      isDirect
                        ? "border-primary/30 bg-primary/5"
                        : "bg-card/40 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(broadcast.createdAt)}
                        </p>
                        <p className="mt-1 font-medium leading-snug wrap-break-word">
                          {broadcast.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {broadcast.body}
                        </p>
                      </div>
                      <Badge variant={isDirect ? "default" : "secondary"}>
                        {audienceLabel(broadcast.audience)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {broadcast.recipient
                          ? broadcast.recipient.username
                          : "Аудитория"}
                      </span>
                      <span>Отправлено {broadcast.sentCount}</span>
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
                    <TableHead>Заголовок</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Получатель</TableHead>
                    <TableHead>Отправлено</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Рассылки не найдены
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {items.map((broadcast) => {
                    const isDirect = broadcast.audience === "DIRECT_USER"
                    return (
                      <TableRow
                        key={broadcast.id}
                        className={cn(
                          "cursor-pointer",
                          isDirect && "bg-primary/5",
                        )}
                        onClick={() => openDetail(broadcast)}
                      >
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(broadcast.createdAt)}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="font-medium wrap-break-word">
                            {broadcast.title}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {broadcast.body}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isDirect ? "default" : "secondary"}>
                            {audienceLabel(broadcast.audience)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {broadcast.recipient ? (
                            <div className="min-w-0">
                              <p className="font-medium">
                                {broadcast.recipient.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {broadcast.recipient.email}
                              </p>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {broadcast.sentCount}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <CreateBroadcastDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void loadList()}
      />
      <BroadcastDetailDrawer
        open={detailOpen}
        broadcast={selected}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
