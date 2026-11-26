import type { ArchiveResponse } from "@/lib/api"

/** Absolute Nest base for RSC (relative /api breaks Node fetch). */
function resolveServerApiUrl(): string {
  const proxy = process.env.API_PROXY_TARGET?.replace(/\/$/, "")
  if (proxy) return `${proxy}/api`
  const pub = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
  if (pub && /^https?:\/\//i.test(pub)) return pub
  return "http://127.0.0.1:8000/api"
}

const API_URL = resolveServerApiUrl()

/** Server-only public archive fetch for RSC. */
export async function getPublicArchive(limit = 100): Promise<ArchiveResponse | null> {
  try {
    const response = await fetch(
      `${API_URL}/bets/archive?page=1&limit=${limit}`,
      {
        next: { revalidate: 60 },
      },
    )
    if (!response.ok) return null
    return (await response.json()) as ArchiveResponse
  } catch {
    return null
  }
}

export type ArchiveSeriesPoint = {
  date: string
  bets: number
  wins: number
}

const MONTHS_RU = [
  "янв.",
  "февр.",
  "мар.",
  "апр.",
  "мая",
  "июн.",
  "июл.",
  "авг.",
  "сент.",
  "окт.",
  "нояб.",
  "дек.",
] as const

/** Cumulative win/bet series by UTC day — used in RSC (no client TZ available). */
export function buildArchiveSeries(
  items: ArchiveResponse["items"],
): ArchiveSeriesPoint[] {
  const chronological = [...items].sort((a, b) =>
    a.publishedAt.localeCompare(b.publishedAt),
  )
  let bets = 0
  let wins = 0
  const byDay = new Map<string, ArchiveSeriesPoint>()

  for (const item of chronological) {
    bets += 1
    if (item.result === "WON") wins += 1
    const d = new Date(item.publishedAt)
    // RSC has no browser TZ — keep UTC day buckets for stable SSR labels.
    const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    const label = `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]}`
    byDay.set(dayKey, { date: label, bets, wins })
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)
}
