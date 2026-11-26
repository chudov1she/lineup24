"use client"

import { usePathname } from "next/navigation"

import { MobileTabBar } from "@/components/layout/mobile-tab-bar"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { cn } from "@/lib/utils"

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col",
        !isHome && "bg-sheet",
      )}
    >
      <SiteHeader />
      <div
        className={cn(
          "h-[3.75rem] shrink-0 sm:h-[5.25rem]",
          !isHome && "bg-sheet",
        )}
        aria-hidden
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  )
}
