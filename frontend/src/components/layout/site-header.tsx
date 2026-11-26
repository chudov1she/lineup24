"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogIn } from "lucide-react"
import { useEffect, useState } from "react"

import { useAuthSession } from "@/components/auth/auth-session"
import { buttonVariants } from "@/components/ui/button"
import { navItems, site } from "@/data/site"
import { cn } from "@/lib/utils"

const authButtonClass = cn(
  buttonVariants({ size: "lg" }),
  "inline-flex h-9 items-center gap-1.5 rounded-full border-0 bg-white px-3 text-sm font-medium text-ink hover:bg-white/90 sm:h-10 sm:gap-2 sm:px-4",
)

export function SiteHeader() {
  const pathname = usePathname()
  const { user, loading, openAuth } = useAuthSession()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isHome = pathname === "/"
  const solid = scrolled || !isHome

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
      <div className="pointer-events-auto w-full">
        <div
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-full border-0 px-2.5 transition-[background-color,box-shadow] duration-300 sm:h-16 sm:gap-3 sm:px-6",
            solid
              ? "bg-ink shadow-[0_12px_40px_-18px_oklch(0_0_0/0.45)]"
              : "bg-transparent shadow-none",
          )}
        >
          <Link
            href="/"
            className="font-display pl-1 text-lg tracking-[0.06em] text-white sm:text-2xl"
          >
            {site.name}
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "text-white" : "text-white/65 hover:text-white",
                  )}
                >
                  {item.label}
                  {active ? (
                    <span className="nav-active-dot animate-pulse-dot" />
                  ) : null}
                </Link>
              )
            })}
          </nav>

          {!loading && user ? (
            <Link href="/dashboard" className={authButtonClass}>
              <LogIn className="size-4 shrink-0" strokeWidth={1.75} />
              Войти
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuth("login")}
              className={authButtonClass}
            >
              <LogIn className="size-4 shrink-0" strokeWidth={1.75} />
              Войти
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
