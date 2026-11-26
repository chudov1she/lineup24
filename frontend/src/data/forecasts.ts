export type Forecast = {
  date: string
  sport: string
  match: string
  prediction: string
  odd: number
  /** Счёт матча, если уже сыгран */
  result: string
  hit?: boolean
}

export type Season = {
  id: number
  label: string
  profitability?: {
    flat10: string
    flat5: string
  }
  forecasts: Forecast[]
}

export const seasons: Season[] = [
  {
    id: 12,
    label: "2026/2027",
    profitability: {
      flat10: "+12%",
      flat5: "+6%",
    },
    forecasts: [
      {
        date: "15-11-2026",
        sport: "Хоккей",
        match: "Торонто - Бостон",
        prediction: "ТБ 5.5",
        odd: 1.78,
        result: "2-2",
        hit: false,
      },
      {
        date: "14-11-2026",
        sport: "Хоккей",
        match: "Сент-Луис - Флорида",
        prediction: "П2 в матче (с от и бул)",
        odd: 1.9,
        result: "1-4",
        hit: true,
      },
      {
        date: "12-11-2026",
        sport: "Хоккей",
        match: "Вегас - Даллас",
        prediction: "П1 в матче (с от и бул)",
        odd: 1.85,
        result: "4-2",
        hit: true,
      },
      {
        date: "10-11-2026",
        sport: "Хоккей",
        match: "Вашингтон - Каролина",
        prediction: "ТМ 6.5",
        odd: 1.72,
        result: "3-2",
        hit: true,
      },
      {
        date: "08-11-2026",
        sport: "Хоккей",
        match: "Эдмонтон - Калгари",
        prediction: "П1 в матче",
        odd: 1.95,
        result: "1-3",
        hit: false,
      },
      {
        date: "05-11-2026",
        sport: "Хоккей",
        match: "Колорадо - Миннесота",
        prediction: "Обе забьют — да",
        odd: 1.65,
        result: "3-2",
        hit: true,
      },
      {
        date: "02-11-2026",
        sport: "Хоккей",
        match: "Нью-Йорк Айлендерс - Питтсбург",
        prediction: "П2 в матче (с от и бул)",
        odd: 2.05,
        result: "2-3",
        hit: true,
      },
      {
        date: "30-10-2026",
        sport: "Хоккей",
        match: "Чикаго - Детройт",
        prediction: "ТБ 5.5",
        odd: 1.8,
        result: "2-1",
        hit: false,
      },
    ],
  },
  {
    id: 11,
    label: "2025/2026",
    profitability: {
      flat10: "+8%",
      flat5: "+4%",
    },
    forecasts: [
      {
        date: "20-04-2026",
        sport: "Хоккей",
        match: "Флорида - Каролина",
        prediction: "П1 в матче (с от и бул)",
        odd: 1.88,
        result: "3-1",
        hit: true,
      },
      {
        date: "18-04-2026",
        sport: "Хоккей",
        match: "Даллас - Эдмонтон",
        prediction: "ТБ 5.5",
        odd: 1.74,
        result: "2-4",
        hit: true,
      },
      {
        date: "15-04-2026",
        sport: "Хоккей",
        match: "Торонто - Флорида",
        prediction: "П2 в матче",
        odd: 2.1,
        result: "4-1",
        hit: false,
      },
      {
        date: "12-04-2026",
        sport: "Хоккей",
        match: "Бостон - Рейнджерс",
        prediction: "ТМ 6.5",
        odd: 1.7,
        result: "2-2",
        hit: true,
      },
    ],
  },
]

export const activeSeasonList = [{ id: 12, label: "2026/2027" }] as const

export const archiveSeasonList = [{ id: 11, label: "2025/2026" }] as const

export const seasonList = [
  ...activeSeasonList,
  ...archiveSeasonList,
] as const

export function getSeason(id: number): Season {
  return (
    seasons.find((s) => s.id === id) ?? {
      id,
      label: seasonList.find((s) => s.id === id)?.label ?? String(id),
      forecasts: [],
    }
  )
}

export function getSeasonStats(season: Season) {
  const total = season.forecasts.length
  const hits = season.forecasts.filter((f) => f.hit).length
  const rate = total > 0 ? Math.round((hits / total) * 100) : 0
  return { total, hits, rate }
}

/** Текущий сезон для блока proof на главной. */
export const currentSeasonId = 12

export function getCurrentSeasonProof() {
  const season = getSeason(currentSeasonId)
  const stats = getSeasonStats(season)
  return { season, ...stats }
}

function parseForecastDate(date: string) {
  const [dd, mm, yyyy] = date.split("-").map(Number)
  return new Date(yyyy, mm - 1, dd).getTime()
}

/** Накопительный % заходов по сезону (хронология для графика). */
export function getSeasonHitSeries(season: Season) {
  const chronological = [...season.forecasts].sort(
    (a, b) => parseForecastDate(a.date) - parseForecastDate(b.date)
  )
  let hits = 0

  return chronological.map((forecast, index) => {
    if (forecast.hit) hits += 1
    const total = index + 1
    return {
      date: forecast.date.slice(0, 5),
      rate: Math.round((hits / total) * 100),
      hits,
      total,
    }
  })
}

const monthLabels = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
] as const

/** Стабильный PRNG для одинаковых цифр на SSR и клиенте. */
function createSeededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function sampleHitRate(fromYear: number) {
  const sample = seasons
    .flatMap((season) => season.forecasts)
    .filter((forecast) => Number(forecast.date.slice(6, 10)) >= fromYear)
  if (sample.length === 0) return 0.62
  const hits = sample.filter((forecast) => forecast.hit).length
  return hits / sample.length
}

/**
 * Накопительная динамика по месяцам для графика на главной.
 */
export function getDistanceMonthlySeries(fromYear = 2023) {
  const random = createSeededRandom(fromYear * 1009 + 17)
  const hitRate = sampleHitRate(fromYear)
  const endYear = 2026
  const endMonth = 10

  let bets = 0
  let wins = 0

  const series: {
    date: string
    year: string
    bets: number
    wins: number
  }[] = [
    {
      date: `янв ${fromYear}`,
      year: String(fromYear),
      bets: 0,
      wins: 0,
    },
  ]

  for (let year = fromYear; year <= endYear; year += 1) {
    const lastMonth = year === endYear ? endMonth : 11
    for (let monthIndex = 0; monthIndex <= lastMonth; monthIndex += 1) {
      const days = daysInMonth(year, monthIndex)
      for (let day = 1; day <= days; day += 1) {
        const dailyVolume = 1 + Math.floor(random() * 2)
        for (let i = 0; i < dailyVolume; i += 1) {
          bets += 1
          if (random() < hitRate) wins += 1
        }
      }

      series.push({
        date: `${monthLabels[monthIndex]} ${year}`,
        year: String(year),
        bets,
        wins,
      })
    }
  }

  return series
}

export function getDistanceProof(fromYear = 2023) {
  const series = getDistanceMonthlySeries(fromYear)
  const last = series.at(-1)
  const total = last?.bets ?? 0
  const hits = last?.wins ?? 0
  const rate = total > 0 ? Math.round((hits / total) * 100) : 0
  const months = Math.max(series.length - 1, 0)

  return {
    fromYear,
    rate,
    hits,
    total,
    months,
    series,
  }
}

