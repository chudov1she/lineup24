"use client"

import { AdminOnly } from "@/components/dashboard/admin-only"
import { UsersView } from "@/components/dashboard/users-view"

export default function AdminUsersPage() {
  return (
    <AdminOnly>
      <UsersView />
    </AdminOnly>
  )
}
