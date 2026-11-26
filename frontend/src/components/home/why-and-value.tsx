import { WhyAndValueView } from "@/components/home/why-and-value-view"
import {
  buildArchiveSeries,
  getPublicArchive,
} from "@/lib/public-archive"

/** Server Component: fetch archive → hand off to client view/animation. */
export async function WhyAndValue() {
  const archive = await getPublicArchive(100)
  const series = archive ? buildArchiveSeries(archive.items) : []
  const total = archive?.total ?? 0
  const won = archive?.won ?? 0
  const rate = archive?.hitRate ?? 0

  const metrics = [
    {
      label: "В архиве",
      value: String(total),
      hint: "закрытых ставок",
    },
    {
      label: "Выигрыши",
      value: String(won),
      hint: `из ${total || "—"}`,
    },
    {
      label: "Проходимость",
      value: total > 0 ? `${rate}%` : "—",
      hint: "доля выигрышей",
    },
    {
      label: "На графике",
      value: String(series.length),
      hint: "точек по дням",
    },
  ]

  return (
    <WhyAndValueView
      metrics={metrics}
      series={series}
      failed={archive === null}
    />
  )
}
