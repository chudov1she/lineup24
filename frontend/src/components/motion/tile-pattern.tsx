import { cn } from "@/lib/utils"

export type TilePatternVariant =
  | "field"
  | "arcs"
  | "radar"
  | "chart"
  | "mesh"
  | "orbit"
  | "bars"
  | "nodes"

type TilePatternProps = {
  variant?: TilePatternVariant
  className?: string
  tone?: "light" | "dark"
}

function strokeFor(tone: "light" | "dark") {
  return tone === "light" ? "white" : "currentColor"
}

function opacityFor(tone: "light" | "dark") {
  return tone === "light" ? 0.22 : 0.14
}

/** Decorative SVG backdrop — several distinct patterns for dark tiles. */
export function TilePattern({
  variant = "field",
  className,
  tone = "light",
}: TilePatternProps) {
  const stroke = strokeFor(tone)
  const opacity = opacityFor(tone)

  return (
    <svg
      aria-hidden
      viewBox="0 0 640 360"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
      preserveAspectRatio="xMidYMid slice"
    >
      {variant === "field" ? <PatternField stroke={stroke} opacity={opacity} /> : null}
      {variant === "arcs" ? <PatternArcs stroke={stroke} opacity={opacity} /> : null}
      {variant === "radar" ? <PatternRadar stroke={stroke} opacity={opacity} /> : null}
      {variant === "chart" ? <PatternChart stroke={stroke} opacity={opacity} /> : null}
      {variant === "mesh" ? <PatternMesh stroke={stroke} opacity={opacity} /> : null}
      {variant === "orbit" ? <PatternOrbit stroke={stroke} opacity={opacity} /> : null}
      {variant === "bars" ? <PatternBars stroke={stroke} opacity={opacity} /> : null}
      {variant === "nodes" ? <PatternNodes stroke={stroke} opacity={opacity} /> : null}
    </svg>
  )
}

/** @deprecated Prefer TilePattern with variant="field" */
export function FieldGrid(props: Omit<TilePatternProps, "variant">) {
  return <TilePattern variant="field" {...props} />
}

function PatternField({
  stroke,
  opacity,
}: {
  stroke: string
  opacity: number
}) {
  return (
    <>
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        opacity={opacity}
        className="animate-field-breathe"
      >
        <rect x="24" y="24" width="592" height="312" rx="4" />
        <line x1="320" y1="24" x2="320" y2="336" />
        <circle cx="320" cy="180" r="48" />
        <circle cx="320" cy="180" r="3" fill={stroke} stroke="none" />
        <path d="M24 120h72v120H24" />
        <path d="M616 120h-72v120h72" />
      </g>
      <g className="animate-field-scan">
        <line
          x1="24"
          y1="0"
          x2="616"
          y2="0"
          stroke={stroke}
          strokeWidth="2"
          opacity={0.35}
        />
      </g>
      <circle
        cx="120"
        cy="90"
        r="4"
        fill={stroke}
        opacity={0.5}
        className="animate-pulse-dot"
      />
    </>
  )
}

function PatternArcs({
  stroke,
  opacity,
}: {
  stroke: string
  opacity: number
}) {
  return (
    <g
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      opacity={opacity}
      className="animate-field-breathe"
    >
      <path d="M40 320 C 120 80, 280 80, 360 320" />
      <path d="M120 320 C 200 120, 360 120, 440 320" />
      <path d="M200 320 C 280 160, 440 160, 520 320" />
      <path d="M280 320 C 360 200, 520 200, 600 320" />
      <circle
        cx="360"
        cy="140"
        r="5"
        fill={stroke}
        stroke="none"
        opacity={0.7}
        className="animate-pulse-dot"
      />
    </g>
  )
}

function PatternRadar({
  stroke,
  opacity,
}: {
  stroke: string
  opacity: number
}) {
  return (
    <>
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        opacity={opacity}
        className="animate-field-breathe"
      >
        <circle cx="320" cy="180" r="40" />
        <circle cx="320" cy="180" r="80" />
        <circle cx="320" cy="180" r="120" />
        <circle cx="320" cy="180" r="160" />
        <line x1="320" y1="20" x2="320" y2="340" />
        <line x1="140" y1="180" x2="500" y2="180" />
      </g>
      <g className="origin-center animate-ring-expand" style={{ transformOrigin: "320px 180px" }}>
        <path
          d="M320 180 L320 40"
          stroke={stroke}
          strokeWidth="2"
          opacity={0.45}
        />
      </g>
      <circle
        cx="400"
        cy="120"
        r="4"
        fill={stroke}
        className="animate-pulse-dot"
      />
      <circle
        cx="250"
        cy="230"
        r="3.5"
        fill={stroke}
        className="animate-pulse-dot-delayed"
      />
    </>
  )
}

function PatternChart({
  stroke,
  opacity,
}: {
  stroke: string
  opacity: number
}) {
  return (
    <>
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        opacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M48 280 L140 220 L220 250 L300 140 L380 180 L460 90 L560 120 L600 70"
          className="animate-field-breathe"
        />
        <path
          d="M48 300 L140 270 L220 290 L300 210 L380 240 L460 170 L560 190 L600 150"
          opacity={0.55}
        />
      </g>
      <g fill={stroke} opacity={opacity + 0.15}>
        <circle cx="300" cy="140" r="4" className="animate-pulse-dot" />
        <circle cx="460" cy="90" r="4" className="animate-pulse-dot-delayed" />
      </g>
    </>
  )
}

function PatternMesh({
  stroke,
  opacity,
}: {
  stroke: string
  opacity: number
}) {
  const lines = []
  for (let i = 0; i < 8; i++) {
    const x = 40 + i * 80
    lines.push(
      <line key={`v-${i}`} x1={x} y1="20" x2={x} y2="340" />,
    )
  }
  for (let i = 0; i < 5; i++) {
    const y = 40 + i * 70
    lines.push(
      <line key={`h-${i}`} x1="20" y1={y} x2="620" y2={y} />,
    )
  }

  return (
    <g
      fill="none"
      stroke={stroke}
      strokeWidth="1"
      opacity={opacity * 0.85}
      className="animate-field-breathe"
    >
      {lines}
      <circle
        cx="200"
        cy="180"
        r="5"
        fill={stroke}
        stroke="none"
        className="animate-pulse-dot"
      />
      <circle
        cx="440"
        cy="110"
        r="4"
        fill={stroke}
        stroke="none"
        className="animate-pulse-dot-delayed"
      />
    </g>
  )
}

function PatternOrbit({
  stroke,
  opacity,
}: {
  stroke: string
  opacity: number
}) {
  return (
    <g
      fill="none"
      stroke={stroke}
      strokeWidth="1.35"
      opacity={opacity}
      className="animate-field-breathe"
    >
      <ellipse cx="320" cy="180" rx="220" ry="90" />
      <ellipse cx="320" cy="180" rx="150" ry="60" />
      <ellipse cx="320" cy="180" rx="80" ry="32" />
      <circle cx="320" cy="180" r="8" fill={stroke} stroke="none" opacity={0.8} />
      <circle
        cx="500"
        cy="140"
        r="5"
        fill={stroke}
        stroke="none"
        className="animate-pulse-dot"
      />
      <circle
        cx="180"
        cy="210"
        r="4"
        fill={stroke}
        stroke="none"
        className="animate-pulse-dot-delayed"
      />
    </g>
  )
}

function PatternBars({
  stroke,
  opacity,
}: {
  stroke: string
  opacity: number
}) {
  const heights = [90, 140, 110, 180, 150, 210, 130, 170, 100, 190]
  return (
    <g fill={stroke} opacity={opacity} className="animate-field-breathe">
      {heights.map((h, i) => {
        const x = 60 + i * 54
        const y = 300 - h
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="28"
            height={h}
            rx="4"
            opacity={0.55 + (i % 3) * 0.12}
          />
        )
      })}
      <circle
        cx="546"
        cy="110"
        r="4"
        className="animate-pulse-dot"
      />
    </g>
  )
}

function PatternNodes({
  stroke,
  opacity,
}: {
  stroke: string
  opacity: number
}) {
  const nodes = [
    [100, 90],
    [220, 140],
    [160, 240],
    [340, 80],
    [400, 200],
    [300, 280],
    [500, 120],
    [540, 260],
    [440, 300],
  ] as const

  return (
    <>
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        opacity={opacity}
      >
        <path d="M100 90 L220 140 L160 240 L220 140 L340 80 L400 200 L300 280 L400 200 L500 120 L540 260 L440 300" />
        <path d="M340 80 L500 120" />
        <path d="M160 240 L300 280" />
      </g>
      <g fill={stroke} opacity={opacity + 0.2}>
        {nodes.map(([x, y], i) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={i % 3 === 0 ? 5 : 3.5}
            className={i === 0 ? "animate-pulse-dot" : i === 4 ? "animate-pulse-dot-delayed" : undefined}
          />
        ))}
      </g>
    </>
  )
}
