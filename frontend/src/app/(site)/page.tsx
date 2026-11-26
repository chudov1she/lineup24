import type { Metadata } from "next"

import { AccessBento } from "@/components/home/access-bento"
import { ContentSheet } from "@/components/home/content-sheet"
import { Hero } from "@/components/home/hero"
import { HomepageVisitBeacon } from "@/components/home/homepage-visit-beacon"
import { WhatIs } from "@/components/home/what-is"
import { WhyAndValue } from "@/components/home/why-and-value"
import { sitePages } from "@/lib/seo"

export const metadata: Metadata = sitePages.home

export default function HomePage() {
  return (
    <>
      <HomepageVisitBeacon />
      <Hero />
      <ContentSheet>
        <WhatIs />
        <WhyAndValue />
        <AccessBento />
      </ContentSheet>
    </>
  )
}
