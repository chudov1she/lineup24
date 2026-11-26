import type { Metadata } from "next"

import { PageFrame, PageIntro } from "@/components/layout/page-frame"
import { Reveal } from "@/components/motion/reveal"
import { PricingPlans } from "@/components/pricing/pricing-plans"
import { sitePages } from "@/lib/seo"

export const metadata: Metadata = sitePages.pricing

export default function PricingPage() {
  return (
    <PageFrame>
      <Reveal>
        <PageIntro
          kicker="Продукты"
          title="Тарифы"
          lead="Буст банка +30% — основной формат. Линия на 30 дней — если нужен фиксированный срок без цели по банку."
        />
      </Reveal>

      <div className="mt-8 sm:mt-10">
        <PricingPlans />
      </div>
    </PageFrame>
  )
}
