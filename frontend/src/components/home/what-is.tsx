import { Reveal } from "@/components/motion/reveal"
import { TilePattern } from "@/components/motion/tile-pattern"
import { whatIs } from "@/data/site"

const advantagePatterns = ["radar", "nodes", "bars"] as const

/** Server Component — static copy; Reveal is the client island. */
export function WhatIs() {
  return (
    <section className="home-section-first">
      <Reveal offset={36}>
        <h2 className="home-title lg:whitespace-nowrap">{whatIs.title}</h2>
        <p className="mt-2 max-w-xl text-sm text-ink/60 sm:text-base">
          {whatIs.lead}
        </p>
      </Reveal>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-stretch">
        <Reveal delay={100} offset={40} variant="scale" className="h-full">
          <div className="bento-ink relative h-full overflow-hidden">
            <TilePattern variant="field" className="opacity-40" />
            <div className="relative space-y-4 text-sm leading-relaxed text-white/70 sm:text-base">
              {whatIs.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </Reveal>

        <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {whatIs.advantages.map((item, index) => (
            <li key={item.title}>
              <Reveal delay={180 + index * 100} offset={32} className="h-full">
                <div className="bento-soft relative h-full overflow-hidden">
                  <TilePattern
                    variant={advantagePatterns[index] ?? "mesh"}
                    className="opacity-30"
                  />
                  <span
                    aria-hidden
                    className="absolute top-4 right-4 font-heading text-3xl font-semibold text-white/10 tabular-nums"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="bento-title relative text-white">{item.title}</h3>
                  <p className="bento-copy relative text-white/65">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
