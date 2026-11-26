"use client"

import { motion } from "motion/react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type RevealVariant = "up" | "fade" | "scale"

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  offset?: number
  once?: boolean
  variant?: RevealVariant
}

function initialFor(variant: RevealVariant, offset: number) {
  if (variant === "fade") return { opacity: 0, y: 0, scale: 1 }
  if (variant === "scale") return { opacity: 0, y: 16, scale: 0.98 }
  return { opacity: 0, y: offset, scale: 1 }
}

/**
 * Client-only scroll reveal. Use from Server Components as a leaf wrapper.
 * Data must be fetched on the server and passed in as children/props.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  offset = 36,
  once = true,
  variant = "up",
}: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={initialFor(variant, offset)}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, amount: 0.2 }}
      transition={{
        duration: 0.55,
        delay: delay / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

export function RevealStagger({
  children,
  className,
  stagger = 90,
  offset = 28,
  variant = "up",
}: {
  children: ReactNode[]
  className?: string
  stagger?: number
  offset?: number
  variant?: RevealVariant
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <Reveal
          key={index}
          delay={index * stagger}
          offset={offset}
          variant={variant}
        >
          {child}
        </Reveal>
      ))}
    </div>
  )
}
