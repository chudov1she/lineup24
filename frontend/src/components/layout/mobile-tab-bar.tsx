"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChartColumn, Home, Ticket } from "lucide-react"

import { cn } from "@/lib/utils"

const tabs = [
  { href: "/", label: "Главная", icon: Home, id: "home" },
  { href: "/pricing", label: "Тарифы", icon: Ticket, id: "pricing" },
  { href: "/static", label: "Статистика", icon: ChartColumn, id: "static" },
] as const

export function MobileTabBar() {
  const pathname = usePathname()

  const activeId = (() => {
    if (pathname.startsWith("/pricing")) return "pricing"
    if (pathname.startsWith("/static")) return "static"
    if (pathname === "/") return "home"
    return null
  })()

  return (
    <nav
      aria-label="Мобильная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex w-full justify-center px-3 md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="pointer-events-auto grid w-full max-w-md grid-cols-3 items-center rounded-[1.75rem] bg-ink/95 p-1.5 shadow-[0_10px_30px_-10px_oklch(0_0_0/0.55)] backdrop-blur-md">
        {tabs.map((tab) => {
          const active = activeId === tab.id
          return (
            <li key={tab.id} className="min-w-0">
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-colors",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/50 active:bg-white/5 active:text-white/80"
                )}
              >
                <tab.icon
                  className="size-5 shrink-0"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span className="max-w-full truncate text-[0.7rem] font-medium leading-none tracking-tight">
                  {tab.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
