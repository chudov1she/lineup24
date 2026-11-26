"use client"

import type { ReactNode } from "react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  title,
  actions,
}: {
  title: string
  actions?: ReactNode
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 shrink-0 data-vertical:self-auto"
        />
        <h1 className="min-w-0 flex-1 truncate font-heading text-base font-semibold tracking-tight">
          {title}
        </h1>
        {actions ? (
          <div className="flex shrink-0 items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}
