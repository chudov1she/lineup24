import type { Metadata } from "next"

import { AuthPage } from "@/components/auth/auth-page"
import { sitePages } from "@/lib/seo"

export const metadata: Metadata = sitePages.signup

export default function SignupPage() {
  return <AuthPage base="register" />
}
