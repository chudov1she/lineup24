"use client"

import * as React from "react"
import Link from "next/link"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { CalendarIcon, ExternalLinkIcon, ListFilterIcon } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import { metricsApi, type MetricsSnapshot } from "@/lib/api"
import {
  addLocalDays,
  formatDayKey,
  localDayKey,
  startOfLocalMonth,
} from "@/lib/datetime"
import { cn } from "@/lib/utils"

type PeriodPreset = "7d" | "30d" | "month" | "custom"
type ChartSeriesKey = "activity" | "users" | "revenue"

function formatRub(value: number) {
  return `${value.toLocaleString("ru-RU")} ₽`
}

function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function rangeForPreset(preset: PeriodPreset): { from: string; to: string } {
  const to = localDayKey()
  if (preset === "7d") return { from: addLocalDays(to, -6), to }
  if (preset === "month") return { from: startOfLocalMonth(to), to }
  return { from: addLocalDays(to, -29), to }
}

const chartConfig = {
  value: { label: "Значение", color: "var(--chart-1)" },
} satisfies ChartConfig

function DateField({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="date"
          value={value}
          className="relative h-10 w-full pr-9 md:h-8 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0!"
          onChange={(event) => onChange(event.target.value)}
        />
        <CalendarIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  note,
  action,
}: {
  label: string
  value: React.ReactNode
  note?: string
  action?: React.ReactNode
}) {
  return (
    <Card size="sm" className="gap-2">
      <CardHeader className="gap-1">
        <div className="flex items-start justify-between gap-2">
          <CardDescription className="text-xs leading-snug sm:text-sm">
            {label}
          </CardDescription>
          {action}
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
          {value}
        </CardTitle>
        {note ? (
          <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">
            {note}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  )
}

export function MetricsView() {
  const isMobile = useIsMobile()
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [preset, setPreset] = React.useState<PeriodPreset>("30d")
  const initial = rangeForPreset("30d")
  const [from, setFrom] = React.useState(initial.from)
  const [to, setTo] = React.useState(initial.to)
  const [draftFrom, setDraftFrom] = React.useState(initial.from)
  const [draftTo, setDraftTo] = React.useState(initial.to)
  const [draftPreset, setDraftPreset] = React.useState<PeriodPreset>("30d")
  const [chartKey, setChartKey] = React.useState<ChartSeriesKey>("activity")
  const [data, setData] = React.useState<MetricsSnapshot | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void metricsApi
      .snapshot({ from, to })
      .then((snapshot) => {
        if (!cancelled) setData(snapshot)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить")
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, to])

  function applyPreset(next: PeriodPreset) {
    setPreset(next)
    if (next === "custom") return
    const range = rangeForPreset(next)
    setFrom(range.from)
    setTo(range.to)
  }

  function openFilters() {
    setDraftFrom(from)
    setDraftTo(to)
    setDraftPreset(preset)
    setFiltersOpen(true)
  }

  function applyDraftFilters() {
    setFrom(draftFrom)
    setTo(draftTo)
    setPreset(draftPreset)
    setFiltersOpen(false)
  }

  function setDraftByPreset(next: PeriodPreset) {
    setDraftPreset(next)
    if (next === "custom") return
    const range = rangeForPreset(next)
    setDraftFrom(range.from)
    setDraftTo(range.to)
  }

  const freeSeats = data
    ? Math.max(0, data.seats.limit - data.seats.used)
    : 0

  const chartRows = React.useMemo(() => {
    if (!data) return []
    const source =
      chartKey === "activity"
        ? data.series.activityDaily
        : chartKey === "users"
          ? data.series.usersDaily
          : data.series.revenuePaidDaily
    return source.map((point) => ({ date: point.date, value: point.value }))
  }, [chartKey, data])

  const chartMeta =
    chartKey === "activity"
      ? {
          title: "Посещения кабинета",
          description: "Сколько людей были активны по дням",
        }
      : chartKey === "users"
        ? {
            title: "Новые регистрации",
            description: "Сколько аккаунтов создали по дням",
          }
        : {
            title: "Поступления",
            description: "Сумма успешных оплат по дням",
          }

  const desktopFilters = (
    <div className="hidden items-center justify-end gap-1.5 md:flex">
      <ToggleGroup
        multiple={false}
        value={preset === "custom" ? [] : [preset]}
        onValueChange={(value) => {
          const next = value[0]
          if (next === "7d" || next === "30d" || next === "month") {
            applyPreset(next)
          }
        }}
        variant="outline"
        spacing={0}
      >
        <ToggleGroupItem value="7d" className="h-8 px-2.5 text-xs">
          7д
        </ToggleGroupItem>
        <ToggleGroupItem value="30d" className="h-8 px-2.5 text-xs">
          30д
        </ToggleGroupItem>
        <ToggleGroupItem value="month" className="h-8 px-2.5 text-xs">
          Мес
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="relative">
        <Input
          type="date"
          aria-label="Период с"
          value={from}
          className="relative h-8 w-[11.5rem] pr-8 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0!"
          onChange={(event) => {
            setPreset("custom")
            setFrom(event.target.value)
          }}
        />
        <CalendarIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      <span className="text-xs text-muted-foreground">—</span>
      <div className="relative">
        <Input
          type="date"
          aria-label="Период по"
          value={to}
          className="relative h-8 w-[11.5rem] pr-8 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0!"
          onChange={(event) => {
            setPreset("custom")
            setTo(event.target.value)
          }}
        />
        <CalendarIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  )

  return (
    <>
      <SiteHeader title="Метрики" actions={desktopFilters} />

      <Drawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        showSwipeHandle
        swipeDirection="down"
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Фильтры</DrawerTitle>
            <DrawerDescription>
              Период для показателей и графика
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-2">
            <ToggleGroup
              multiple={false}
              value={draftPreset === "custom" ? [] : [draftPreset]}
              onValueChange={(value) => {
                const next = value[0]
                if (next === "7d" || next === "30d" || next === "month") {
                  setDraftByPreset(next)
                }
              }}
              variant="outline"
              className="grid w-full grid-cols-3"
            >
              <ToggleGroupItem value="7d" className="h-10">
                7 дней
              </ToggleGroupItem>
              <ToggleGroupItem value="30d" className="h-10">
                30 дней
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className="h-10">
                Месяц
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="grid grid-cols-1 gap-3">
              <DateField
                id="metrics-draft-from"
                label="С"
                value={draftFrom}
                onChange={(value) => {
                  setDraftPreset("custom")
                  setDraftFrom(value)
                }}
              />
              <DateField
                id="metrics-draft-to"
                label="По"
                value={draftTo}
                onChange={(value) => {
                  setDraftPreset("custom")
                  setDraftTo(value)
                }}
              />
            </div>
          </div>
          <DrawerFooter>
            <Button type="button" className="w-full" onClick={applyDraftFilters}>
              Применить
            </Button>
            <DrawerClose
              render={<Button type="button" variant="outline" className="w-full" />}
            >
              Отмена
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-5 py-4 md:gap-8 md:py-6">
            <div className="px-4 md:hidden lg:px-6">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={openFilters}
              >
                <ListFilterIcon />
                Фильтры
              </Button>
            </div>

            {error ? (
              <p className="px-4 text-sm text-destructive lg:px-6">{error}</p>
            ) : null}
            {loading && !data ? (
              <p className="px-4 text-sm text-muted-foreground lg:px-6">
                Собираем показатели…
              </p>
            ) : null}

            {data ? (
              <>
                <section className="flex flex-col gap-2.5 px-4 lg:px-6">
                  <div>
                    <h3 className="text-sm font-medium">Люди</h3>
                    <p className="text-xs text-muted-foreground">
                      Кто в продукте сейчас и всего
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                    <MetricTile
                      label="Сейчас в кабинете"
                      value={data.onlineNow}
                      note={
                        data.onlineNow === 0
                          ? "Никого в последние минуты"
                          : "Активны прямо сейчас"
                      }
                      action={
                        data.onlineNow > 0 ? (
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            сейчас
                          </Badge>
                        ) : null
                      }
                    />
                    <MetricTile
                      label="Посещали"
                      value={data.activeUsersInPeriod}
                      note="С активностью за период"
                    />
                    <MetricTile
                      label="Всего"
                      value={data.usersTotal}
                      note="Все аккаунты"
                      action={
                        <Button
                          variant="outline"
                          size="xs"
                          nativeButton={false}
                          render={<Link href="/dashboard/users" />}
                        >
                          {isMobile ? "→" : "Список"}
                          {!isMobile ? <ExternalLinkIcon /> : null}
                        </Button>
                      }
                    />
                    <MetricTile
                      label="С подпиской"
                      value={data.activeSubscriberUsers}
                      note={
                        freeSeats === 0
                          ? `${data.seats.used}/${data.seats.limit} · мест нет`
                          : `${data.seats.used}/${data.seats.limit} · своб. ${freeSeats}`
                      }
                    />
                  </div>
                </section>

                <section className="flex flex-col gap-2.5 px-4 lg:px-6">
                  <div>
                    <h3 className="text-sm font-medium">Деньги</h3>
                    <p className="text-xs text-muted-foreground">
                      Оплаты и выданные доступы
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <MetricTile
                      label="Оплаты за период"
                      value={formatRub(data.revenuePaidInPeriod)}
                      note={
                        data.paidOrdersInPeriod === 0
                          ? `Платежей нет · всего ${formatRub(data.revenuePaidRub)}`
                          : `${data.paidOrdersInPeriod} ${pluralRu(data.paidOrdersInPeriod, "платёж", "платежа", "платежей")} · всего ${formatRub(data.revenuePaidRub)}`
                      }
                    />
                    <MetricTile
                      label="Выданные доступы"
                      value={formatRub(data.grantsRubInPeriod)}
                      note={
                        data.grantsCountInPeriod === 0
                          ? `Не выдавали · всего ${data.grantsCount}`
                          : `${data.grantsCountInPeriod} ${pluralRu(data.grantsCountInPeriod, "выдача", "выдачи", "выдач")} · всего ${formatRub(data.grantsRub)}`
                      }
                    />
                  </div>
                </section>

                <section className="flex flex-col gap-2.5 px-4 lg:px-6">
                  <div>
                    <h3 className="text-sm font-medium">Привлечение</h3>
                    <p className="text-xs text-muted-foreground">
                      Главная и блокировки
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <MetricTile
                      label="Гости главной"
                      value={data.homepageUniquesInPeriod}
                      note={`Сегодня: ${data.homepageUniquesToday}`}
                    />
                    <MetricTile
                      label="Заблокированы"
                      value={data.blockedUsers}
                      note="Без доступа"
                      action={
                        <Button
                          variant="ghost"
                          size="xs"
                          nativeButton={false}
                          render={<Link href="/dashboard/users" />}
                        >
                          {isMobile ? "→" : "Открыть"}
                        </Button>
                      }
                    />
                  </div>
                </section>

                <section className="px-4 lg:px-6">
                  <Card size="sm" className="gap-3">
                    <CardHeader className="gap-3">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg">
                            {chartMeta.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {chartMeta.description}
                          </CardDescription>
                        </div>
                        <Select
                          value={chartKey}
                          items={[
                            { value: "activity", label: "Посещения" },
                            { value: "users", label: "Регистрации" },
                            { value: "revenue", label: "Оплаты" },
                          ]}
                          onValueChange={(value) => {
                            if (
                              value === "activity" ||
                              value === "users" ||
                              value === "revenue"
                            ) {
                              setChartKey(value)
                            }
                          }}
                        >
                          <SelectTrigger
                            className="h-9 w-full sm:hidden"
                            size="sm"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="activity">Посещения</SelectItem>
                            <SelectItem value="users">Регистрации</SelectItem>
                            <SelectItem value="revenue">Оплаты</SelectItem>
                          </SelectContent>
                        </Select>
                        <ToggleGroup
                          multiple={false}
                          value={[chartKey]}
                          onValueChange={(value) => {
                            const next = value[0]
                            if (
                              next === "activity" ||
                              next === "users" ||
                              next === "revenue"
                            ) {
                              setChartKey(next)
                            }
                          }}
                          variant="outline"
                          className="hidden shrink-0 sm:flex"
                        >
                          <ToggleGroupItem value="activity">
                            Посещения
                          </ToggleGroupItem>
                          <ToggleGroupItem value="users">
                            Регистрации
                          </ToggleGroupItem>
                          <ToggleGroupItem value="revenue">
                            Оплаты
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-2 sm:px-4 sm:pb-4">
                      <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-[180px] w-full sm:h-[220px]"
                      >
                        <AreaChart
                          data={chartRows}
                          margin={{ left: 0, right: 4, top: 4, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="fillMetricsMain"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="var(--color-value)"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="var(--color-value)"
                                stopOpacity={0.02}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={isMobile ? 40 : 28}
                            tickFormatter={(value) => formatDayKey(String(value))}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            width={isMobile ? 28 : 36}
                            allowDecimals={false}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                labelFormatter={(value) =>
                                  typeof value === "string"
                                    ? formatDayKey(value, "long")
                                    : String(value)
                                }
                              />
                            }
                          />
                          <Area
                            dataKey="value"
                            type="monotone"
                            fill="url(#fillMetricsMain)"
                            stroke="var(--color-value)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </section>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
