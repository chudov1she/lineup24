"use client"

import { useState } from "react"
import { MailIcon, PlusIcon } from "lucide-react"

import { useAuthSession } from "@/components/auth/auth-session"
import { CreateBroadcastDrawer } from "@/components/dashboard/create-broadcast-drawer"
import { ManageBetDrawer } from "@/components/dashboard/manage-bet-drawer"
import { useSignalsActivityOptional } from "@/components/dashboard/signals-activity"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function AdminQuickActions() {
  const { user } = useAuthSession()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const signalsActivity = useSignalsActivityOptional()
  const [signalOpen, setSignalOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const collapsed = state === "collapsed"

  if (user?.role !== "ADMIN") return null

  function openSignal() {
    if (isMobile) setOpenMobile(false)
    setSignalOpen(true)
  }

  function openBroadcast() {
    if (isMobile) setOpenMobile(false)
    setBroadcastOpen(true)
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              className={cn(
                "flex flex-row items-center gap-1.5",
                collapsed && "flex-col gap-1",
              )}
            >
              <SidebarMenuButton
                tooltip="Новый сигнал"
                forceTooltip
                onClick={openSignal}
                className={cn(
                  "h-9 min-w-0 bg-foreground font-bold text-background hover:bg-foreground/90 hover:text-background active:bg-foreground/90 active:text-background",
                  !collapsed && "flex-1",
                )}
              >
                <PlusIcon strokeWidth={2.5} />
                <span className="font-bold">Новый сигнал</span>
              </SidebarMenuButton>
              <SidebarMenuButton
                tooltip="Создать рассылку"
                forceTooltip
                onClick={openBroadcast}
                className={cn(
                  "h-9 shrink-0 justify-center border border-foreground/20 bg-foreground/12 text-foreground hover:bg-foreground/20 hover:text-foreground active:bg-foreground/20 active:text-foreground",
                  !collapsed && "w-9! max-w-9 px-0",
                  collapsed && "w-full",
                )}
              >
                <MailIcon />
                <span className="sr-only">Рассылка</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <ManageBetDrawer
        open={signalOpen}
        mode="create"
        bet={null}
        onOpenChange={setSignalOpen}
        onChanged={() => {
          void signalsActivity?.refresh()
        }}
      />
      <CreateBroadcastDrawer
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
      />
    </>
  )
}
