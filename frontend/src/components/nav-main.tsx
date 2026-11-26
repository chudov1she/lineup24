"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavSignalDot } from "@/components/dashboard/nav-signal-dot"
import { useSignalsActivityOptional } from "@/components/dashboard/signals-activity"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const signalsActivity = useSignalsActivityOptional()
  const collapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const active =
              item.url === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.url || pathname.startsWith(`${item.url}/`)
            const showUnseen =
              item.url === "/dashboard/signals" &&
              Boolean(signalsActivity?.hasUnseen) &&
              !active

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={active}
                  render={<Link href={item.url} />}
                >
                  <span className="relative">
                    {item.icon}
                    {showUnseen && collapsed ? (
                      <NavSignalDot className="absolute -top-0.5 -right-0.5" />
                    ) : null}
                  </span>
                  <span>{item.title}</span>
                  {showUnseen && !collapsed ? (
                    <NavSignalDot className="ml-auto" />
                  ) : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
