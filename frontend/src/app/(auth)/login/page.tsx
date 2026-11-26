import type { Metadata } from "next"

import { AuthPage } from "@/components/auth/auth-page"
import { sitePages } from "@/lib/seo"

export const metadata: Metadata = sitePages.login

export default function LoginPage() {
  return <AuthPage base="login" />
}
