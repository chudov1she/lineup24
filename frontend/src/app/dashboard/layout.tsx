import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardAuthGate } from "@/components/dashboard/dashboard-auth-gate"
import { SignalsActivityProvider } from "@/components/dashboard/signals-activity"
import { TosReacceptGate } from "@/components/dashboard/tos-reaccept-gate"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  SIDEBAR_COOKIE_NAME,
  sidebarOpenFromCookie,
} from "@/lib/sidebar-cookie"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = sidebarOpenFromCookie(
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value,
  )

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <DashboardAuthGate>
        <TosReacceptGate>
          <SignalsActivityProvider>
            <SidebarProvider
              defaultOpen={defaultOpen}
              style={
                {
                  "--sidebar-width": "calc(var(--spacing) * 72)",
                  "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
              }
            >
              <AppSidebar variant="inset" />
              <SidebarInset>{children}</SidebarInset>
            </SidebarProvider>
          </SignalsActivityProvider>
        </TosReacceptGate>
      </DashboardAuthGate>
    </div>
  )
}
