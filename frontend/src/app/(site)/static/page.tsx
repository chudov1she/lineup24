import type { Metadata } from "next"

import { PageFrame } from "@/components/layout/page-frame"
import { LiveArchiveBoard } from "@/components/stats/live-archive-board"
import { sitePages } from "@/lib/seo"

export const metadata: Metadata = sitePages.stats

export default function StaticPage() {
  return (
    <PageFrame>
      <LiveArchiveBoard />
    </PageFrame>
  )
}
