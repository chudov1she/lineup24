import type { Metadata } from "next"

import { dashboardPages } from "@/lib/seo"

export const metadata: Metadata = dashboardPages.broadcasts

export default function BroadcastsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
