"use client"

import Link from "next/link"
import { Mail } from "lucide-react"

import { Reveal } from "@/components/motion/reveal"
import { TilePattern } from "@/components/motion/tile-pattern"
import { footerLinks, navItems, site } from "@/data/site"

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-white pb-[5.5rem] md:pb-0">
      <TilePattern variant="mesh" className="opacity-20" />
      <div className="home-pad relative w-full pt-24 pb-8 sm:pt-36 sm:pb-16 lg:pb-20">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <Reveal offset={28}>
            <p className="font-display text-2xl tracking-[0.06em]">{site.name}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
              {site.disclaimer} {site.age}
            </p>
            <a
              href={`mailto:${site.email}`}
              className="mt-5 inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
            >
              <Mail className="size-4" />
              {site.email}
            </a>
          </Reveal>

          <Reveal delay={90} offset={28}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Разделы
            </p>
            <ul className="mt-4 space-y-2.5">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/contacts"
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  Контакты
                </Link>
              </li>
            </ul>
          </Reveal>

          <Reveal delay={160} offset={28}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Документы
            </p>
            <ul className="mt-4 space-y-2.5">
              {footerLinks
                .filter((link) => link.href !== "/contacts")
                .map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={220} variant="fade">
          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 {site.domain}. Все права защищены.</p>
            <p>{site.legal}</p>
          </div>
        </Reveal>
      </div>
    </footer>
  )
}
