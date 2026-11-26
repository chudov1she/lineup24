import type { Metadata } from "next"

import { dashboardPages } from "@/lib/seo"

export const metadata: Metadata = dashboardPages.users

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
