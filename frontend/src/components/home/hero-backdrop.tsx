"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"

export function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const animation = el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.2)" },
        { transform: "scale(1)" },
      ],
      {
        duration: 14000,
        iterations: Infinity,
        easing: "ease-in-out",
      }
    )

    return () => animation.cancel()
  }, [])

  return (
    <div ref={ref} className="absolute inset-[-8%] will-change-transform">
      <Image
        src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=2400&q=80"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
    </div>
  )
}
