import type { ReactNode } from "react"

import { PageFrame } from "@/components/layout/page-frame"

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt?: string
  children: ReactNode
}) {
  return (
    <PageFrame>
      <p className="page-kicker">Документы</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
        {title}
      </h1>
      {updatedAt ? (
        <p className="mt-3 text-sm text-ink/45">Редакция от {updatedAt}</p>
      ) : null}
      <div className="prose-legal mt-8 max-w-4xl space-y-4 text-sm leading-relaxed text-ink/65 sm:mt-10 sm:space-y-5 sm:text-base [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink sm:[&_h2]:mt-10 sm:[&_h2]:text-2xl [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </PageFrame>
  )
}
