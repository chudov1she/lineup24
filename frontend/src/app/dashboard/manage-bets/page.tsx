"use client"

import { AdminOnly } from "@/components/dashboard/admin-only"
import { ManageBetsView } from "@/components/dashboard/manage-bets-view"

export default function ManageBetsPage() {
  return (
    <AdminOnly>
      <ManageBetsView />
    </AdminOnly>
  )
}
