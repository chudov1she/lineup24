"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { useAuthSession } from "@/components/auth/auth-session"
import { AdminQuickActions } from "@/components/dashboard/admin-quick-actions"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { BRAND } from "@/lib/brand"
import {
  LayoutDashboardIcon,
  RadioIcon,
  CreditCardIcon,
  Settings2Icon,
  UsersIcon,
  ListOrderedIcon,
  MegaphoneIcon,
  BarChart3Icon,
} from "lucide-react"

const navMain = [
  {
    title: "Обзор",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Сигналы",
    url: "/dashboard/signals",
    icon: <RadioIcon />,
  },
  {
    title: "Подписка",
    url: "/dashboard/subscription",
    icon: <CreditCardIcon />,
  },
]

const navSecondary = [
  {
    title: "Настройки",
    url: "/dashboard/settings",
    icon: <Settings2Icon />,
  },
]

const navAdmin = [
  {
    title: "Метрики",
    url: "/dashboard/metrics",
    icon: <BarChart3Icon />,
  },
  {
    title: "Пользователи",
    url: "/dashboard/users",
    icon: <UsersIcon />,
  },
  {
    title: "Управление ставками",
    url: "/dashboard/manage-bets",
    icon: <ListOrderedIcon />,
  },
  {
    title: "Рассылки",
    url: "/dashboard/broadcasts",
    icon: <MegaphoneIcon />,
  },
]

function CloseMobileSidebarOnNavigate() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  React.useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  return null
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthSession()
  const isAdmin = user?.role === "ADMIN"

  const displayUser = user
    ? {
        name: user.username,
        email: user.email,
        avatar: user.avatarUrl ?? "",
      }
    : { name: "—", email: "—", avatar: "" }

  return (
    <>
      {/* Outside Sheet so the listener stays mounted while the mobile menu closes. */}
      <CloseMobileSidebarOnNavigate />
      <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-0">
        <div className="flex h-12 w-full items-center px-3 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Открыть сайт"
            className="font-heading w-full truncate text-xl font-semibold tracking-tight select-none hover:opacity-80 group-data-[collapsible=icon]:hidden"
          >
            {BRAND.name}
          </a>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Открыть сайт"
            className="font-heading hidden text-sm font-semibold tracking-tight select-none hover:opacity-80 group-data-[collapsible=icon]:inline"
          >
            24
          </a>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {isAdmin ? <AdminQuickActions /> : null}
        <NavMain items={navMain} />
        {isAdmin ? (
          <>
            <SidebarSeparator />
            <NavMain items={navAdmin} />
          </>
        ) : null}
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
      </Sidebar>
    </>
  )
}