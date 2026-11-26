import type { Metadata } from "next"

import { dashboardPages } from "@/lib/seo"

export const metadata: Metadata = dashboardPages.manageBets

export default function ManageBetsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
