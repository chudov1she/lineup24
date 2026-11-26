"use client"

import * as React from "react"

import { useAuthSession } from "@/components/auth/auth-session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import {
  ApiError,
  authApi,
  formatDateTime,
  notificationsApi,
  sessionsApi,
  TELEGRAM_BOT_URL,
  TELEGRAM_BOT_USERNAME,
  type SessionRow,
} from "@/lib/api"
import { mapAuthError, validatePasswordStrength } from "@/lib/auth-errors"
import { cn } from "@/lib/utils"
import {
  BellIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  SendIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

type EmailChangeStep = "idle" | "verify-new"

function sessionLabel(session: SessionRow) {
  const ua = session.userAgent ?? "Неизвестное устройство"
  const platform = session.platform ?? session.deviceType ?? "—"
  return { label: ua.split(" ").slice(0, 3).join(" "), platform }
}

function SessionsList({
  sessions,
  onRevoke,
}: {
  sessions: SessionRow[]
  onRevoke: (id: string) => void
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Активных сессий нет.</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session, index) => {
        const meta = sessionLabel(session)
        const isCurrent = index === 0 && session.isActive
        return (
          <div
            key={session.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
              isCurrent && "border-primary/30 bg-primary/5",
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium tracking-tight">{meta.label}</p>
                {isCurrent ? <Badge variant="secondary">Текущая</Badge> : null}
                {!session.isActive ? (
                  <Badge variant="outline">Завершена</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {meta.platform} · {formatDateTime(session.lastSeenAt)}
              </p>
            </div>
            {session.isActive && !isCurrent ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => onRevoke(session.id)}
              >
                Завершить
              </Button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function SectionIcon({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
      {children}
    </span>
  )
}

export function SettingsView() {
  const { user, refreshUser } = useAuthSession()
  const [emailSignals, setEmailSignals] = React.useState(false)
  const [telegramSignals, setTelegramSignals] = React.useState(false)
  const [browserPushSignals, setBrowserPushSignals] = React.useState(false)
  const [browserPushBusy, setBrowserPushBusy] = React.useState(false)
  const [browserPushHint, setBrowserPushHint] = React.useState<string | null>(
    null,
  )
  const [telegramLinked, setTelegramLinked] = React.useState(false)
  const [telegramUsername, setTelegramUsername] = React.useState<string | null>(
    null,
  )
  const [tgDeepLink, setTgDeepLink] = React.useState<string | null>(null)
  const [tgLinkBusy, setTgLinkBusy] = React.useState(false)
  const [sessions, setSessions] = React.useState<SessionRow[]>([])
  const [username, setUsername] = React.useState("")
  const [profileBusy, setProfileBusy] = React.useState(false)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordBusy, setPasswordBusy] = React.useState(false)

  const [emailStep, setEmailStep] = React.useState<EmailChangeStep>("idle")
  const [newEmail, setNewEmail] = React.useState("")
  const [emailPassword, setEmailPassword] = React.useState("")
  const [emailCode, setEmailCode] = React.useState("")
  const [emailBusy, setEmailBusy] = React.useState(false)
  const [emailHint, setEmailHint] = React.useState<string | null>(null)
  const [pendingNewEmail, setPendingNewEmail] = React.useState<string | null>(
    null,
  )

  React.useEffect(() => {
    if (!user) return
    setUsername(user.username)
    setEmailSignals(user.emailSignals)
    setTelegramSignals(user.telegramSignals)
    setBrowserPushSignals(user.browserPushSignals)
    setTelegramLinked(user.telegramLinked)
    setTelegramUsername(user.telegramUsername)

    const pending = user.emailChangePending
    if (pending) {
      setEmailStep(pending.step)
      setPendingNewEmail(pending.newEmail)
      setNewEmail(pending.newEmail)
    }
  }, [user])

  React.useEffect(() => {
    void sessionsApi
      .list()
      .then(setSessions)
      .catch(() => setSessions([]))
  }, [])

  const email = user?.email ?? "—"
  const usernameDirty =
    Boolean(user) && username.trim() !== (user?.username ?? "")
  const activeSessions = sessions.filter((s) => s.isActive).length

  async function saveUsername() {
    const next = username.trim()
    if (next.length < 3) {
      toast.add({
        title: "Имя пользователя — минимум 3 символа",
        type: "warning",
      })
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(next)) {
      toast.add({
        title: "Имя: только латиница, цифры и _",
        type: "warning",
      })
      return
    }
    setProfileBusy(true)
    try {
      await authApi.changeUsername({ username: next })
      await refreshUser()
      toast.add({ title: "Имя обновлено", type: "success" })
    } catch (err) {
      toast.add({
        title: "Не удалось сохранить имя",
        description: mapAuthError(err),
        type: "warning",
      })
    } finally {
      setProfileBusy(false)
    }
  }

  async function persistPrefs(next: {
    emailSignals?: boolean
    telegramSignals?: boolean
    browserPushSignals?: boolean
  }) {
    try {
      await notificationsApi.updatePrefs(next)
      await refreshUser()
      toast.add({ title: "Настройки сохранены", type: "success" })
    } catch (err) {
      toast.add({
        title: "Ошибка",
        description: err instanceof ApiError ? err.message : "Не удалось сохранить",
        type: "warning",
      })
      throw err
    }
  }

  async function toggleBrowserPush(checked: boolean) {
    const previous = browserPushSignals
    setBrowserPushBusy(true)
    setBrowserPushHint(null)
    try {
      if (checked) {
        const { publicKey } = await notificationsApi.getVapidPublicKey()
        const {
          subscribeBrowserPush,
          pushSubscriptionToPayload,
        } = await import("@/lib/web-push-client")
        const subscription = await subscribeBrowserPush(publicKey)
        await notificationsApi.subscribePush(
          pushSubscriptionToPayload(subscription),
        )
        setBrowserPushSignals(true)
        await refreshUser()
        toast.add({
          title: "Браузерные уведомления включены",
          type: "success",
        })
      } else {
        const { unsubscribeBrowserPush } = await import("@/lib/web-push-client")
        const endpoint = await unsubscribeBrowserPush()
        if (endpoint) {
          await notificationsApi.unsubscribePush(endpoint)
        }
        await persistPrefs({ browserPushSignals: false })
        setBrowserPushSignals(false)
      }
    } catch (err) {
      setBrowserPushSignals(previous)
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Не удалось изменить уведомления браузера"
      setBrowserPushHint(message)
      toast.add({
        title: "Уведомления браузера",
        description: message,
        type: "warning",
      })
    } finally {
      setBrowserPushBusy(false)
    }
  }

  async function loadTelegramDeepLink() {
    setTgLinkBusy(true)
    try {
      const res = await notificationsApi.createTelegramLink()
      if (res.alreadyLinked) {
        await refreshUser()
        setTelegramLinked(true)
        setTgDeepLink(null)
        return
      }
      setTgDeepLink(res.deepLink)
    } catch (err) {
      toast.add({
        title: "Не удалось создать ссылку",
        description: err instanceof ApiError ? err.message : undefined,
        type: "warning",
      })
    } finally {
      setTgLinkBusy(false)
    }
  }

  React.useEffect(() => {
    if (!user || telegramLinked) return
    void loadTelegramDeepLink()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per unlinked session
  }, [user?.id, telegramLinked])

  React.useEffect(() => {
    if (telegramLinked || !tgDeepLink) return
    const timer = window.setInterval(() => {
      void refreshUser()
    }, 2500)
    return () => window.clearInterval(timer)
  }, [telegramLinked, tgDeepLink, refreshUser])

  React.useEffect(() => {
    if (!telegramLinked) return
    setTgDeepLink(null)
  }, [telegramLinked])

  async function unbindTelegram() {
    try {
      await notificationsApi.unbindTelegram()
      await refreshUser()
      toast.add({ title: "Telegram отвязан", type: "info" })
    } catch (err) {
      toast.add({
        title: "Ошибка",
        description: err instanceof ApiError ? err.message : undefined,
        type: "warning",
      })
    }
  }

  function resetEmailWizard() {
    setEmailStep("idle")
    setNewEmail("")
    setEmailPassword("")
    setEmailCode("")
    setEmailHint(null)
    setPendingNewEmail(null)
  }

  async function startEmailChange() {
    const next = newEmail.trim().toLowerCase()
    if (!next || !next.includes("@")) {
      toast.add({ title: "Укажите корректный новый email", type: "warning" })
      return
    }
    if (!emailPassword) {
      toast.add({ title: "Укажите текущий пароль", type: "warning" })
      return
    }
    setEmailBusy(true)
    setEmailHint(null)
    try {
      const result = await authApi.startEmailChange({
        newEmail: next,
        currentPassword: emailPassword,
      })
      setPendingNewEmail(result.newEmail)
      setEmailStep("verify-new")
      setEmailPassword("")
      setEmailCode("")
      setEmailHint(
        result.newCode
          ? `Код отправлен на ${result.newEmail}. Для отладки: ${result.newCode}`
          : `Код отправлен на ${result.newEmail}`,
      )
      toast.add({
        title: "Проверьте новую почту",
        description: "Введите код из письма",
        type: "info",
      })
    } catch (err) {
      toast.add({
        title: "Не удалось начать смену email",
        description: mapAuthError(err),
        type: "warning",
      })
    } finally {
      setEmailBusy(false)
    }
  }

  async function submitEmailCode() {
    const code = emailCode.trim()
    if (!/^\d{6}$/.test(code)) {
      toast.add({ title: "Код должен состоять из 6 цифр", type: "warning" })
      return
    }
    setEmailBusy(true)
    setEmailHint(null)
    try {
      await authApi.verifyEmailChangeNew({ code })
      await refreshUser()
      resetEmailWizard()
      toast.add({ title: "Email обновлён", type: "success" })
    } catch (err) {
      toast.add({
        title: "Неверный код",
        description: mapAuthError(err),
        type: "warning",
      })
    } finally {
      setEmailBusy(false)
    }
  }

  async function resendEmailCode() {
    setEmailBusy(true)
    try {
      const result = await authApi.resendEmailChange()
      setEmailStep("verify-new")
      setPendingNewEmail(result.newEmail)
      setEmailHint(
        result.newCode
          ? `Новый код отправлен на ${result.newEmail}. Для отладки: ${result.newCode}`
          : `Новый код отправлен на ${result.newEmail}`,
      )
      toast.add({ title: "Код отправлен повторно", type: "success" })
    } catch (err) {
      toast.add({
        title: "Не удалось отправить код",
        description: mapAuthError(err),
        type: "warning",
      })
    } finally {
      setEmailBusy(false)
    }
  }

  async function cancelEmailChange() {
    setEmailBusy(true)
    try {
      await authApi.cancelEmailChange()
      await refreshUser()
      resetEmailWizard()
      toast.add({ title: "Смена email отменена", type: "info" })
    } catch (err) {
      toast.add({
        title: "Не удалось отменить",
        description: mapAuthError(err),
        type: "warning",
      })
    } finally {
      setEmailBusy(false)
    }
  }

  async function changePassword() {
    if (!currentPassword) {
      toast.add({ title: "Укажите текущий пароль", type: "warning" })
      return
    }
    const strengthError = validatePasswordStrength(newPassword)
    if (strengthError) {
      toast.add({ title: strengthError, type: "warning" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast.add({ title: "Пароли не совпадают", type: "warning" })
      return
    }
    setPasswordBusy(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.add({ title: "Пароль обновлён", type: "success" })
    } catch (err) {
      toast.add({
        title: "Не удалось сменить пароль",
        description: mapAuthError(err),
        type: "warning",
      })
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Настройки
        </h2>
        <p className="text-sm text-muted-foreground">
          Профиль, пароль, каналы сигналов и устройства входа.
        </p>
      </div>

      <div className="mx-4 overflow-hidden rounded-xl border bg-linear-to-r from-primary/10 via-card to-card px-4 py-4 lg:mx-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <SectionIcon>
              <UserRoundIcon className="size-4" />
            </SectionIcon>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {user?.username ?? "—"}
                </p>
                {user?.role === "ADMIN" ? (
                  <Badge variant="outline">Админ</Badge>
                ) : (
                  <Badge variant="secondary">Пользователь</Badge>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="tabular-nums">
              {activeSessions} сес.
            </Badge>
            {telegramLinked ? (
              <Badge variant="secondary">
                Telegram
                {telegramUsername ? ` @${telegramUsername}` : ""}
              </Badge>
            ) : (
              <Badge variant="outline">Telegram не привязан</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-4 *:data-[slot=card]:h-full *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 dark:*:data-[slot=card]:bg-card @3xl/main:grid-cols-2">
        <Card id="profile" className="scroll-mt-20 @container/card">
          <CardHeader>
            <div className="flex items-start gap-3">
              <SectionIcon>
                <UserRoundIcon className="size-4" />
              </SectionIcon>
              <div className="min-w-0">
                <CardTitle className="font-heading">Профиль и email</CardTitle>
                <CardDescription>
                  Имя в кабинете и смена почты (код на новый адрес)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5">
            <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor="username">Имя пользователя</FieldLabel>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={3}
                  maxLength={32}
                  autoComplete="username"
                  placeholder="latin_letters_123"
                />
                <FieldDescription>
                  Латиница, цифры и _. От 3 до 32 символов.
                </FieldDescription>
              </Field>
            </div>

            <div className="flex flex-1 flex-col gap-3 border-t pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-tight">Email</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {email}
                  </p>
                </div>
                {user?.emailVerifiedAt ? (
                  <Badge variant="secondary">Подтверждён</Badge>
                ) : (
                  <Badge variant="outline">Не подтверждён</Badge>
                )}
              </div>

              {emailStep === "idle" ? (
                <div className="grid gap-3">
                  <Field>
                    <FieldLabel htmlFor="new-email">Новый email</FieldLabel>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="new@example.com"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email-password">
                      Текущий пароль
                    </FieldLabel>
                    <PasswordInput
                      id="email-password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                    <FieldDescription>
                      Код подтверждения уйдёт на новый email
                    </FieldDescription>
                  </Field>
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="rounded-xl border border-dashed border-primary/25 bg-primary/5 px-3.5 py-3">
                    <p className="text-sm font-medium tracking-tight">
                      Код на новую почту
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Отправили на {pendingNewEmail ?? newEmail}
                    </p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="email-code">Код из письма</FieldLabel>
                    <Input
                      id="email-code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={emailCode}
                      onChange={(e) =>
                        setEmailCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="6 цифр"
                      autoComplete="one-time-code"
                      className="font-mono tracking-[0.2em]"
                    />
                  </Field>
                  {emailHint ? (
                    <p className="text-xs text-muted-foreground">{emailHint}</p>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="mt-auto flex flex-wrap gap-2 border-t">
            <Button
              className="rounded-full"
              disabled={profileBusy || !usernameDirty}
              onClick={() => void saveUsername()}
            >
              {profileBusy ? "Сохранение…" : "Сохранить имя"}
            </Button>
            {emailStep === "idle" ? (
              <Button
                className="rounded-full"
                disabled={emailBusy || !newEmail.trim() || !emailPassword}
                onClick={() => void startEmailChange()}
              >
                {emailBusy ? "Отправка…" : "Сменить email"}
              </Button>
            ) : (
              <>
                <Button
                  className="rounded-full"
                  disabled={emailBusy || emailCode.length !== 6}
                  onClick={() => void submitEmailCode()}
                >
                  {emailBusy ? "Проверка…" : "Подтвердить код"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={emailBusy}
                  onClick={() => void resendEmailCode()}
                >
                  Снова
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full"
                  disabled={emailBusy}
                  onClick={() => void cancelEmailChange()}
                >
                  Отмена
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        <Card id="password" className="scroll-mt-20 @container/card">
          <CardHeader>
            <div className="flex items-start gap-3">
              <SectionIcon>
                <KeyRoundIcon className="size-4" />
              </SectionIcon>
              <div className="min-w-0">
                <CardTitle className="font-heading">Пароль</CardTitle>
                <CardDescription>
                  Смена пароля для входа в кабинет
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor="current-password">Текущий</FieldLabel>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-password">Новый</FieldLabel>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Повтор</FieldLabel>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </Field>
            </div>
          </CardContent>
          <CardFooter className="mt-auto border-t">
            <Button
              className="rounded-full"
              disabled={passwordBusy || !currentPassword || !newPassword}
              onClick={() => void changePassword()}
            >
              {passwordBusy ? "Сохранение…" : "Сменить пароль"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card
          id="notifications"
          className="scroll-mt-20 bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card"
        >
          <CardHeader>
            <div className="flex items-start gap-3">
              <SectionIcon>
                <BellIcon className="size-4" />
              </SectionIcon>
              <div className="min-w-0">
                <CardTitle className="font-heading">Уведомления</CardTitle>
                <CardDescription>
                  Куда отправлять сигналы. Telegram — через QR или ссылку из
                  настроек
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-card/60 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <MailIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium tracking-tight">Email</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {email}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailSignals}
                  onCheckedChange={(checked) => {
                    setEmailSignals(checked)
                    void persistPrefs({ emailSignals: checked }).catch(() =>
                      setEmailSignals(!checked),
                    )
                  }}
                />
              </div>

              {telegramLinked ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <SendIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium tracking-tight">
                        Telegram
                        {telegramUsername ? ` @${telegramUsername}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Бот @{TELEGRAM_BOT_USERNAME}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch
                      checked={telegramSignals}
                      onCheckedChange={(checked) => {
                        setTelegramSignals(checked)
                        void persistPrefs({ telegramSignals: checked }).catch(
                          () => setTelegramSignals(!checked),
                        )
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => void unbindTelegram()}
                    >
                      Отвязать
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <BellIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium tracking-tight">
                      Уведомления браузера
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Push даже при закрытой вкладке
                    </p>
                    {browserPushHint ? (
                      <p className="mt-1 text-xs text-destructive">
                        {browserPushHint}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Switch
                  checked={browserPushSignals}
                  disabled={browserPushBusy}
                  onCheckedChange={(checked) => {
                    setBrowserPushSignals(checked)
                    void toggleBrowserPush(checked)
                  }}
                />
              </div>
            </div>

            {!telegramLinked ? (
              <div className="rounded-xl border border-dashed border-primary/25 bg-linear-to-br from-primary/10 via-muted/20 to-card p-4 sm:p-5">
                <div className="grid gap-5 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-start">
                  <div className="flex flex-col items-start gap-3">
                    <div className="rounded-xl border bg-white p-2 shadow-xs">
                      {tgDeepLink ? (
                        <QRCodeSVG
                          value={tgDeepLink}
                          size={128}
                          level="M"
                          marginSize={1}
                          title={`Привязка @${TELEGRAM_BOT_USERNAME}`}
                        />
                      ) : (
                        <div className="flex size-32 items-center justify-center text-xs text-muted-foreground">
                          {tgLinkBusy ? "…" : "QR"}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full"
                      disabled={!tgDeepLink}
                      nativeButton={false}
                      render={
                        <a
                          href={tgDeepLink ?? TELEGRAM_BOT_URL}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      <ExternalLinkIcon data-icon="inline-start" />
                      Открыть Telegram
                    </Button>
                  </div>
                  <div className="flex min-w-0 flex-col gap-3">
                    <div>
                      <p className="font-heading text-base font-semibold tracking-tight">
                        Привязка Telegram
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Отсканируйте QR или нажмите кнопку — бот @{TELEGRAM_BOT_USERNAME}{" "}
                        привяжется сам, без кода.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      После открытия бота эта страница обновится автоматически.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-fit rounded-full"
                      disabled={tgLinkBusy}
                      onClick={() => void loadTelegramDeepLink()}
                    >
                      Обновить ссылку
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card
          id="sessions"
          className="scroll-mt-20 bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card"
        >
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <SectionIcon>
                  <ShieldCheckIcon className="size-4" />
                </SectionIcon>
                <div className="min-w-0">
                  <CardTitle className="font-heading">
                    Сессии и устройства
                  </CardTitle>
                  <CardDescription>
                    Активные входы. Завершите чужие, если не узнаёте устройство
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="tabular-nums">
                {activeSessions} активных
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <SessionsList
              sessions={sessions}
              onRevoke={async (id) => {
                try {
                  await sessionsApi.revoke(id)
                  setSessions((prev) => prev.filter((s) => s.id !== id))
                  toast.add({ title: "Сессия завершена", type: "success" })
                } catch (err) {
                  toast.add({
                    title: "Ошибка",
                    description:
                      err instanceof ApiError ? err.message : undefined,
                    type: "warning",
                  })
                }
              }}
            />
          </CardContent>
          <CardFooter className="border-t">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={async () => {
                try {
                  await sessionsApi.revokeOthers()
                  const list = await sessionsApi.list()
                  setSessions(list)
                  toast.add({
                    title: "Вышли везде, кроме этого устройства",
                    type: "success",
                  })
                } catch (err) {
                  toast.add({
                    title: "Ошибка",
                    description:
                      err instanceof ApiError ? err.message : undefined,
                    type: "warning",
                  })
                }
              }}
            >
              <MonitorSmartphoneIcon data-icon="inline-start" />
              Выйти везде
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
