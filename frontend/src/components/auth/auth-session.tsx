"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

import {
  ApiError,
  authApi,
  type MeResponse,
  type SubscriptionPlan,
} from "@/lib/api"
import { authHref, type AuthBase } from "@/lib/auth-routes"

type AuthSessionContextValue = {
  user: MeResponse | null
  loading: boolean
  openAuth: (mode?: AuthBase, planCode?: SubscriptionPlan) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()

  const [user, setUser] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.me()
      setUser(profile)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null)
      } else if (!(error instanceof ApiError)) {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const openAuth = useCallback(
    (mode: AuthBase = "login", planCode?: SubscriptionPlan) => {
      router.push(authHref(mode, planCode))
    },
    [router],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Cookies may already be cleared.
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      openAuth,
      logout,
      refreshUser,
    }),
    [user, loading, openAuth, logout, refreshUser],
  )

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  )
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext)
  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider")
  }
  return context
}

export type { AuthBase }
