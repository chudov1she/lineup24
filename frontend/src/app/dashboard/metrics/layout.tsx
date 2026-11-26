import type { Metadata } from "next"

import { dashboardPages } from "@/lib/seo"

export const metadata: Metadata = dashboardPages.metrics

export default function MetricsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
