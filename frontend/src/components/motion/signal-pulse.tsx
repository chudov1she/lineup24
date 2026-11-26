import { cn } from "@/lib/utils"

export function SignalPulse({
  className,
  tone = "light",
}: {
  className?: string
  tone?: "light" | "dark"
}) {
  const stroke = tone === "light" ? "white" : "currentColor"

  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      className={cn("pointer-events-none", className)}
    >
      <circle
        cx="60"
        cy="60"
        r="18"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        opacity={0.55}
        className="origin-center animate-ring-expand"
      />
      <circle
        cx="60"
        cy="60"
        r="18"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        opacity={0.4}
        className="origin-center animate-ring-expand-delayed"
      />
      <circle cx="60" cy="60" r="6" fill={stroke} opacity={0.85} />
    </svg>
  )
}
