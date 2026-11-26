"use client"

import { AdminOnly } from "@/components/dashboard/admin-only"
import { BroadcastsView } from "@/components/dashboard/broadcasts-view"

export default function BroadcastsPage() {
  return (
    <AdminOnly>
      <BroadcastsView />
    </AdminOnly>
  )
}
