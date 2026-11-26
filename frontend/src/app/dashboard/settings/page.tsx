import type { Metadata } from "next"

import { SettingsView } from "@/components/dashboard/settings-view"
import { SiteHeader } from "@/components/site-header"
import { dashboardPages } from "@/lib/seo"

export const metadata: Metadata = dashboardPages.settings

export default function SettingsPage() {
  return (
    <>
      <SiteHeader title="Настройки" />
      <SettingsView />
    </>
  )
}
