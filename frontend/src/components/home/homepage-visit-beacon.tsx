"use client"

import { useEffect } from "react"

import { analyticsApi } from "@/lib/api"
import { hasCookieConsent } from "@/lib/cookie-consent"
import { localDayKey } from "@/lib/datetime"

const STORAGE_KEY = "lineup:homepage-visit-day"

function trackHomepageVisit() {
  if (!hasCookieConsent()) return
  const day = localDayKey()
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === day) return
    window.localStorage.setItem(STORAGE_KEY, day)
  } catch {
    // private mode — still attempt server cookie dedupe
  }
  void analyticsApi.pageview("/").catch(() => {
    // analytics must not break the homepage
  })
}

/** Fire-and-forget unique homepage visit once per local calendar day per browser. */
export function HomepageVisitBeacon() {
  useEffect(() => {
    trackHomepageVisit()
    const onConsent = () => trackHomepageVisit()
    window.addEventListener("lineup24:cookie-consent", onConsent)
    return () => {
      window.removeEventListener("lineup24:cookie-consent", onConsent)
    }
  }, [])

  return null
}
