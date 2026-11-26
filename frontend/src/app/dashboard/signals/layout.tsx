import type { Metadata } from "next"

import { dashboardPages } from "@/lib/seo"

export const metadata: Metadata = dashboardPages.signals

export default function SignalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
