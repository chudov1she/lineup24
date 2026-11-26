import type { Metadata } from "next"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { PlanStatusBanner } from "@/components/dashboard/plan-status-banner"
import { RecentBets } from "@/components/dashboard/recent-bets"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { dashboardPages } from "@/lib/seo"

export const metadata: Metadata = dashboardPages.overview

export default function DashboardOverviewPage() {
  return (
    <>
      <SiteHeader title="Обзор" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <PlanStatusBanner />
            <SectionCards />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
            <div className="flex flex-col gap-3 px-4 lg:px-6">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h2 className="font-heading text-base font-semibold tracking-tight">
                    Последние сигналы
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    За время активной подписки
                  </p>
                </div>
              </div>
              <RecentBets />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
