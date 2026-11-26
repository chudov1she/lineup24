"use client"

import { AdminOnly } from "@/components/dashboard/admin-only"
import { MetricsView } from "@/components/dashboard/metrics-view"

export default function MetricsPage() {
  return (
    <AdminOnly>
      <MetricsView />
    </AdminOnly>
  )
}
