"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { CoinsIcon } from "lucide-react"

import { formatBank } from "@/components/dashboard/bank-coins"
import {
  Card,
  CardAction,
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
import { useSignalsActivityOptional } from "@/components/dashboard/signals-activity"
import {
  getBankChartSeries,
  loadSettledBetsForChart,
  loadSubscriptionMe,
  type BankChartRange,
  type ChartPoint,
} from "@/lib/dashboard-data"
import type { Bet, SubscriptionMeResponse } from "@/lib/api"

const chartConfig = {
  bank: {
    label: "Банк",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function formatAxisTick(iso: string, range: BankChartRange) {
  const date = new Date(iso)
  if (range === "24h") {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  })
}

function formatTooltipLabel(iso: string, range: BankChartRange) {
  const date = new Date(iso)
  if (range === "24h") {
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState<BankChartRange>("30d")
  const [bets, setBets] = React.useState<Bet[]>([])
  const [sub, setSub] = React.useState<SubscriptionMeResponse | null>(null)
  const [reloadToken, setReloadToken] = React.useState(0)
  const signals = useSignalsActivityOptional()

  React.useEffect(() => {
    return signals?.subscribeBankChanges(() => {
      setReloadToken((n) => n + 1)
    })
  }, [signals])

  React.useEffect(() => {
    void (async () => {
      const [subscription, items] = await Promise.all([
        loadSubscriptionMe(),
        loadSettledBetsForChart(200),
      ])
      setSub(subscription)
      setBets(items)
    })()
  }, [reloadToken])

  const filteredData: ChartPoint[] = React.useMemo(
    () => getBankChartSeries(timeRange, bets, sub),
    [timeRange, bets, sub],
  )

  const bankMin =
    filteredData.length > 0
      ? Math.min(...filteredData.map((p) => p.bank))
      : 1000
  const bankMax =
    filteredData.length > 0
      ? Math.max(...filteredData.map((p) => p.bank))
      : 1000
  const yPad = Math.max(20, Math.round((bankMax - bankMin) * 0.08))

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Динамика банка</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:inline-flex items-center gap-1">
            От старта тарифа
            <CoinsIcon className="size-3.5 text-muted-foreground" aria-hidden />
            · live по закрытым ставкам
          </span>
          <span className="@[540px]/card:hidden inline-flex items-center gap-1">
            Live-банк
            <CoinsIcon className="size-3.5 text-muted-foreground" aria-hidden />
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "24h" || next === "7d" || next === "30d") {
                setTimeRange(next)
              }
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="30d">30 дней</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 дней</ToggleGroupItem>
            <ToggleGroupItem value="24h">24ч</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            items={[
              { value: "30d", label: "30 дней" },
              { value: "7d", label: "7 дней" },
              { value: "24h", label: "24ч" },
            ]}
            onValueChange={(value) => {
              if (value === "24h" || value === "7d" || value === "30d") {
                setTimeRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-36 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Период"
            >
              <SelectValue placeholder="30 дней" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="30d" className="rounded-lg">
                30 дней
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 дней
              </SelectItem>
              <SelectItem value="24h" className="rounded-lg">
                24ч
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {filteredData.length === 0 ? (
          <div className="flex h-[250px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 text-center">
            <p className="font-heading text-sm font-medium tracking-tight">
              График пока пуст
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Динамика банка появится после подключения тарифа и первых
              обновлений банка.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="fillBank" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-bank)"
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-bank)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={timeRange === "24h" ? 24 : 32}
                tickFormatter={(value) =>
                  formatAxisTick(String(value), timeRange)
                }
              />
              <YAxis
                dataKey="bank"
                tickLine={false}
                axisLine={false}
                width={48}
                domain={[bankMin - yPad, bankMax + yPad]}
                tickFormatter={(value) => formatBank(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      formatTooltipLabel(String(value), timeRange)
                    }
                    formatter={(value) => (
                      <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                        {formatBank(Number(value))}
                        <CoinsIcon
                          className="size-3.5 text-muted-foreground"
                          aria-hidden
                        />
                      </span>
                    )}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="bank"
                type="monotone"
                fill="url(#fillBank)"
                stroke="var(--color-bank)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
