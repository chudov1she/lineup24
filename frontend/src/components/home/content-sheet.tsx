import type { ReactNode } from "react"

export function ContentSheet({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 -mt-16 -mb-12 w-full overflow-hidden rounded-[1.5rem] bg-sheet text-ink shadow-[0_-24px_60px_-40px_oklch(0_0_0/0.35)] sm:-mb-20 sm:rounded-[2.5rem] md:-mt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,oklch(0.18_0.012_260/0.05),transparent_70%)]"
      />
      <div className="relative">{children}</div>
    </div>
  )
}
