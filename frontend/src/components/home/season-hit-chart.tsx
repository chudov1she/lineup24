"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  bets: {
    label: "Всего прогнозов",
    color: "oklch(0.72 0.02 260)",
  },
  wins: {
    label: "Выигрыши",
    color: "oklch(0.92 0.01 90)",
  },
} satisfies ChartConfig

export function SeasonHitChart({
  data,
}: {
  data: {
    date: string
    bets: number
    wins: number
  }[]
}) {
  const showDots = data.length < 4

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto !aspect-auto h-[180px] w-full sm:h-[240px] [&_.recharts-cartesian-axis-tick_text]:fill-white/40"
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ left: 4, right: 8, top: 16, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fillBets" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-bets)"
              stopOpacity={0.35}
            />
            <stop
              offset="100%"
              stopColor="var(--color-bets)"
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="fillWins" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-wins)"
              stopOpacity={0.4}
            />
            <stop
              offset="100%"
              stopColor="var(--color-wins)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="oklch(1 0 0 / 0.08)"
          strokeDasharray="0"
        />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
        />
        <YAxis hide allowDecimals={false} domain={[0, "auto"]} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Area
          dataKey="bets"
          type="monotone"
          fill="url(#fillBets)"
          stroke="var(--color-bets)"
          strokeWidth={1.5}
          dot={showDots}
          activeDot={{ r: 4 }}
        />
        <Area
          dataKey="wins"
          type="monotone"
          fill="url(#fillWins)"
          stroke="var(--color-wins)"
          strokeWidth={1.5}
          dot={showDots}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
