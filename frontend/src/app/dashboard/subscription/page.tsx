import type { Metadata } from "next"

import { SubscriptionView } from "@/components/dashboard/subscription-view"
import { SiteHeader } from "@/components/site-header"
import { dashboardPages } from "@/lib/seo"

export const metadata: Metadata = dashboardPages.subscription

export default function SubscriptionPage() {
  return (
    <>
      <SiteHeader title="Подписка" />
      <SubscriptionView />
    </>
  )
}
