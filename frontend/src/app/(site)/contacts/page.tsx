import type { Metadata } from "next"
import { Mail, MessageCircle, Send } from "lucide-react"

import { PageFrame, PageIntro } from "@/components/layout/page-frame"
import { TilePattern } from "@/components/motion/tile-pattern"
import { Reveal } from "@/components/motion/reveal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { contactFaq, site } from "@/data/site"
import { sitePages } from "@/lib/seo"

export const metadata: Metadata = sitePages.contacts

const channels = [
  {
    icon: Mail,
    label: "Почта",
    value: site.email,
    href: `mailto:${site.email}`,
  },
  {
    icon: MessageCircle,
    label: "ВКонтакте",
    value: "Группа проекта",
    href: site.vk,
  },
  {
    icon: Send,
    label: "Telegram",
    value: "Канал и бот",
    href: site.telegram,
  },
]

export default function ContactsPage() {
  return (
    <PageFrame>
      <Reveal>
        <PageIntro
          kicker="Связь"
          title="Контакты"
          lead="Вопросы по аккаунту, тарифу и доступу к актуальной линии. Архив на сайте открыт без подписки."
        />
      </Reveal>

      <ul className="mt-10 grid gap-3 md:grid-cols-3">
        {channels.map((channel, index) => (
          <li key={channel.label}>
            <Reveal delay={80 + index * 90} className="h-full">
              <a
                href={channel.href}
                target={channel.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  channel.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="sheet-inset relative flex h-full items-start gap-4 overflow-hidden px-5 py-5 transition-colors hover:bg-ink/90"
              >
                <TilePattern
                  variant={
                    index === 0 ? "nodes" : index === 1 ? "arcs" : "orbit"
                  }
                  className="opacity-20"
                />
                <channel.icon className="relative mt-0.5 size-5 text-white/70" />
                <span className="relative">
                  <span className="block text-xs font-semibold tracking-[0.16em] text-white/40 uppercase">
                    {channel.label}
                  </span>
                  <span className="mt-1 block text-lg font-medium text-white">
                    {channel.value}
                  </span>
                </span>
              </a>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal delay={160}>
        <section className="mt-16 border-t border-ink/10 pt-12">
          <p className="page-kicker">FAQ</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Частые вопросы
          </h2>
          <Accordion className="mt-6 max-w-4xl border-t border-ink/10">
            {contactFaq.map((item) => (
              <AccordionItem
                key={item.question}
                value={item.question}
                className="border-ink/10"
              >
                <AccordionTrigger className="py-4 text-base text-ink hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-base leading-relaxed text-ink/60">
                  <p>{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </Reveal>
    </PageFrame>
  )
}
