"use client"

import * as React from "react"
import {
  ArrowLeftIcon,
  BanIcon,
  CoinsIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  ShieldIcon,
  TicketIcon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  formatDateTime,
  notificationsApi,
  planLabel,
  subscriptionStatusLabel,
  subscriptionsApi,
  usersApi,
  type AdminUserDetail,
  type Role,
  type SubscriptionPlan,
  type SubscriptionStatusKind,
} from "@/lib/api"
import { cn } from "@/lib/utils"

type DrawerView =
  | "overview"
  | "subscriptions"
  | "bank"
  | "email"
  | "sessions"

type PendingConfirm =
  | { kind: "block" }
  | { kind: "unblock" }
  | { kind: "role"; role: Role }
  | { kind: "grant"; plan: SubscriptionPlan }
  | { kind: "revoke"; subscriptionId: string; plan: SubscriptionPlan }
  | { kind: "bank"; subscriptionId: string; value: number }
  | { kind: "email"; title: string; body: string }

const GRANT_PLANS: Array<{ plan: SubscriptionPlan; label: string }> = [
  { plan: "MONTHLY", label: "Линия на 30 дней" },
  { plan: "BANK_BOOST", label: "Буст банка +30%" },
]

function statusBadgeVariant(
  status: SubscriptionStatusKind,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default"
    case "COMPLETED":
      return "secondary"
    case "REVOKED":
      return "destructive"
  }
}

function ActionRow({
  icon: Icon,
  title,
  description,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70",
        destructive && "border-destructive/30 hover:bg-destructive/10",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0 text-muted-foreground",
          destructive && "text-destructive",
        )}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-medium",
            destructive && "text-destructive",
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  )
}

export function UserDetailDrawer({
  open,
  userId,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  userId: string | null
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const isMobile = useIsMobile()
  const [view, setView] = React.useState<DrawerView>("overview")
  const [detail, setDetail] = React.useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [grantPlan, setGrantPlan] = React.useState<SubscriptionPlan>("MONTHLY")
  const [bankValue, setBankValue] = React.useState("")
  const [emailTitle, setEmailTitle] = React.useState("")
  const [emailBody, setEmailBody] = React.useState("")
  const [confirm, setConfirm] = React.useState<PendingConfirm | null>(null)

  const loadDetail = React.useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const next = await usersApi.detail(id)
      setDetail(next)
      const boost = next.subscriptions.find(
        (item) => item.plan === "BANK_BOOST" && item.status === "ACTIVE",
      )
      setBankValue(
        boost?.bankCurrentRub != null ? String(boost.bankCurrentRub) : "",
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить")
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!open || !userId) return
    setView("overview")
    setConfirm(null)
    setEmailTitle("")
    setEmailBody("")
    setGrantPlan("MONTHLY")
    void loadDetail(userId)
  }, [open, userId, loadDetail])

  function closeDrawer(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setView("overview")
      setConfirm(null)
      setDetail(null)
    }
  }

  const user = detail?.user
  const subscriptions = detail?.subscriptions ?? []
  const activeSubs = subscriptions.filter((item) => item.status === "ACTIVE")
  const boostSub = activeSubs.find((item) => item.plan === "BANK_BOOST")

  async function runConfirmed() {
    if (!user || !confirm) return
    setBusy(true)
    try {
      switch (confirm.kind) {
        case "block":
          await usersApi.update(user.id, { blockedAt: "now" })
          toast.add({ title: "Пользователь заблокирован", type: "success" })
          break
        case "unblock":
          await usersApi.update(user.id, { blockedAt: null })
          toast.add({ title: "Пользователь разблокирован", type: "success" })
          break
        case "role":
          await usersApi.update(user.id, { role: confirm.role })
          toast.add({ title: "Роль обновлена", type: "success" })
          break
        case "grant":
          await subscriptionsApi.grant({
            userId: user.id,
            plan: confirm.plan,
          })
          toast.add({ title: "Доступ выдан", type: "success" })
          setView("subscriptions")
          break
        case "revoke":
          await subscriptionsApi.revoke(confirm.subscriptionId)
          toast.add({ title: "Подписка отозвана", type: "success" })
          setView("subscriptions")
          break
        case "bank":
          await subscriptionsApi.updateBank(
            confirm.subscriptionId,
            confirm.value,
          )
          toast.add({ title: "Банк обновлён", type: "success" })
          setView("subscriptions")
          break
        case "email":
          await notificationsApi.emailUser(user.id, {
            title: confirm.title,
            body: confirm.body,
          })
          toast.add({ title: "Письмо отправлено", type: "success" })
          setEmailTitle("")
          setEmailBody("")
          setView("overview")
          break
      }
      setConfirm(null)
      await loadDetail(user.id)
      onChanged()
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Ошибка",
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  const confirmCopy = React.useMemo(() => {
    if (!user || !confirm) return null
    const who = `${user.username} (${user.email})`
    switch (confirm.kind) {
      case "block":
        return {
          title: "Заблокировать пользователя?",
          description: `${who} потеряет доступ в кабинет.`,
          action: "Заблокировать",
        }
      case "unblock":
        return {
          title: "Разблокировать пользователя?",
          description: `${who} снова сможет войти.`,
          action: "Разблокировать",
        }
      case "role":
        return {
          title: "Сменить роль?",
          description: `${who} станет ${confirm.role === "ADMIN" ? "администратором" : "обычным пользователем"}.`,
          action: "Сменить роль",
        }
      case "grant":
        return {
          title: "Выдать доступ?",
          description: `${who} получит «${planLabel(confirm.plan)}».`,
          action: "Выдать",
        }
      case "revoke":
        return {
          title: "Отозвать подписку?",
          description: `У ${who} будет отозван тариф «${planLabel(confirm.plan)}».`,
          action: "Отозвать",
        }
      case "bank":
        return {
          title: "Сохранить банк?",
          description: `Новое значение банка для ${who}: ${confirm.value}.`,
          action: "Сохранить",
        }
      case "email":
        return {
          title: "Отправить письмо?",
          description: `Письмо «${confirm.title}» уйдёт на ${user.email}.`,
          action: "Отправить",
        }
    }
  }, [confirm, user])

  const title =
    view === "overview"
      ? (user?.username ?? "Пользователь")
      : view === "subscriptions"
        ? "Подписки"
        : view === "bank"
          ? "Банк"
          : view === "email"
            ? "Письмо"
            : "Сессии"

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={closeDrawer}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent className="flex max-h-[92dvh] min-h-0 flex-col">
          <DrawerHeader className="text-left">
            <div className="flex items-start gap-2">
              {view !== "overview" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-0.5"
                  onClick={() =>
                    setView(view === "bank" ? "subscriptions" : "overview")
                  }
                >
                  <ArrowLeftIcon />
                  <span className="sr-only">Назад</span>
                </Button>
              ) : null}
              <div className="min-w-0 flex-1">
                <DrawerTitle>{title}</DrawerTitle>
                <DrawerDescription>
                  {view === "overview" && user
                    ? user.email
                    : view === "subscriptions"
                      ? "История и управление доступом"
                      : "Действие с подтверждением"}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Загрузка…</p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {user && view === "overview" ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {user.role === "ADMIN" ? "Админ" : "Пользователь"}
                  </Badge>
                  {user.blockedAt ? (
                    <Badge variant="destructive">Заблокирован</Badge>
                  ) : (
                    <Badge variant="secondary">Активен</Badge>
                  )}
                  {activeSubs.map((sub) => (
                    <Badge key={sub.id} variant="outline">
                      {planLabel(sub.plan)}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Активность</p>
                    <p className="mt-1 font-medium">
                      {user.lastActivityAt
                        ? formatDateTime(user.lastActivityAt)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Регистрация</p>
                    <p className="mt-1 font-medium">
                      {formatDateTime(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <ActionRow
                    icon={TicketIcon}
                    title="Управление подписками"
                    description={
                      activeSubs.length
                        ? `${activeSubs.length} активных · всего ${subscriptions.length}`
                        : subscriptions.length
                          ? `Активных нет · история ${subscriptions.length}`
                          : "Выдача и история доступа"
                    }
                    onClick={() => setView("subscriptions")}
                  />
                  {boostSub ? (
                    <ActionRow
                      icon={CoinsIcon}
                      title="Банк BOOST"
                      description={`Сейчас ${boostSub.bankCurrentRub ?? "—"}`}
                      onClick={() => setView("bank")}
                    />
                  ) : null}
                  <ActionRow
                    icon={MailIcon}
                    title="Написать на почту"
                    description={user.email}
                    onClick={() => setView("email")}
                  />
                  <ActionRow
                    icon={MonitorSmartphoneIcon}
                    title="Сессии и устройства"
                    description={`${detail?.sessions.length ?? 0} записей`}
                    onClick={() => setView("sessions")}
                  />
                  <ActionRow
                    icon={ShieldIcon}
                    title="Сменить роль"
                    description={
                      user.role === "ADMIN"
                        ? "Сделать обычным пользователем"
                        : "Сделать администратором"
                    }
                    onClick={() =>
                      setConfirm({
                        kind: "role",
                        role: user.role === "ADMIN" ? "USER" : "ADMIN",
                      })
                    }
                  />
                  <ActionRow
                    icon={BanIcon}
                    title={user.blockedAt ? "Разблокировать" : "Заблокировать"}
                    description={
                      user.blockedAt
                        ? "Вернуть доступ в кабинет"
                        : "Запретить вход"
                    }
                    destructive={!user.blockedAt}
                    onClick={() =>
                      setConfirm({
                        kind: user.blockedAt ? "unblock" : "block",
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {user && view === "subscriptions" ? (
              <div className="flex flex-col gap-5">
                <section className="overflow-hidden rounded-xl border">
                  <div className="border-b bg-muted/30 px-3.5 py-3">
                    <p className="text-sm font-medium">Выдать доступ</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Новый тариф появится в истории ниже
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 p-3.5">
                    <div className="grid gap-2">
                      {GRANT_PLANS.map(({ plan, label }) => {
                        const selected = grantPlan === plan
                        return (
                          <button
                            key={plan}
                            type="button"
                            onClick={() => setGrantPlan(plan)}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary/10"
                                : "hover:bg-muted/40",
                            )}
                          >
                            <span className="text-sm font-medium">{label}</span>
                            <span
                              className={cn(
                                "size-4 shrink-0 rounded-full border",
                                selected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                              aria-hidden
                            />
                          </button>
                        )
                      })}
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={busy}
                      onClick={() =>
                        setConfirm({ kind: "grant", plan: grantPlan })
                      }
                    >
                      Выдать «{planLabel(grantPlan)}»
                    </Button>
                  </div>
                </section>

                <section className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between gap-2 px-0.5">
                    <p className="text-sm font-medium">История</p>
                    <p className="text-xs text-muted-foreground">
                      {subscriptions.length
                        ? `${activeSubs.length} акт. · ${subscriptions.length}`
                        : "пусто"}
                    </p>
                  </div>

                  {subscriptions.length === 0 ? (
                    <div className="rounded-xl border border-dashed px-3.5 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Подписок ещё не было
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Выдайте доступ блоком выше
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {subscriptions.map((sub) => (
                        <li
                          key={sub.id}
                          className={cn(
                            "rounded-xl border px-3.5 py-3",
                            sub.status === "ACTIVE" && "border-primary/30 bg-primary/5",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {planLabel(sub.plan)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                с {formatDateTime(sub.startsAt)}
                                {sub.endsAt
                                  ? ` · до ${formatDateTime(sub.endsAt)}`
                                  : ""}
                              </p>
                            </div>
                            <Badge variant={statusBadgeVariant(sub.status)}>
                              {subscriptionStatusLabel(sub.status)}
                            </Badge>
                          </div>

                          {sub.plan === "BANK_BOOST" ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Банк{" "}
                              <span className="font-medium text-foreground tabular-nums">
                                {sub.bankCurrentRub ?? "—"}
                              </span>
                              {sub.bankTargetRub != null
                                ? ` / ${sub.bankTargetRub}`
                                : ""}
                            </p>
                          ) : null}

                          {sub.status === "ACTIVE" ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {sub.plan === "BANK_BOOST" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setView("bank")}
                                >
                                  Банк
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  setConfirm({
                                    kind: "revoke",
                                    subscriptionId: sub.id,
                                    plan: sub.plan,
                                  })
                                }
                              >
                                Отозвать
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : null}

            {user && view === "bank" && boostSub ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="user-bank">Текущий банк</Label>
                  <Input
                    id="user-bank"
                    type="number"
                    inputMode="numeric"
                    value={bankValue}
                    onChange={(event) => setBankValue(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const value = Number(bankValue)
                    if (!Number.isFinite(value) || value < 0) {
                      toast.add({
                        title: "Укажите корректную сумму",
                        type: "error",
                      })
                      return
                    }
                    setConfirm({
                      kind: "bank",
                      subscriptionId: boostSub.id,
                      value,
                    })
                  }}
                >
                  Сохранить
                </Button>
              </div>
            ) : null}

            {user && view === "email" ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="user-email-title">Тема</Label>
                  <Input
                    id="user-email-title"
                    value={emailTitle}
                    onChange={(event) => setEmailTitle(event.target.value)}
                    placeholder="Тема письма"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-email-body">Текст</Label>
                  <Textarea
                    id="user-email-body"
                    value={emailBody}
                    onChange={(event) => setEmailBody(event.target.value)}
                    placeholder="Текст письма"
                    className="min-h-32"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!emailTitle.trim() || !emailBody.trim()) {
                      toast.add({
                        title: "Заполните тему и текст",
                        type: "error",
                      })
                      return
                    }
                    setConfirm({
                      kind: "email",
                      title: emailTitle.trim(),
                      body: emailBody.trim(),
                    })
                  }}
                >
                  Отправить
                </Button>
              </div>
            ) : null}

            {user && view === "sessions" ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Сессии</p>
                  {(detail?.sessions ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Нет сессий</p>
                  ) : (
                    detail?.sessions.slice(0, 12).map((session) => (
                      <div
                        key={session.id}
                        className="rounded-xl border px-3 py-2.5 text-sm"
                      >
                        <p className="font-medium">
                          {session.platform ?? session.deviceType ?? "Устройство"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.ip ?? "IP —"} ·{" "}
                          {formatDateTime(session.lastSeenAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {(detail?.fingerprintOverlaps.length ?? 0) > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Совпадения устройств</p>
                    {detail?.fingerprintOverlaps.slice(0, 8).map((item) => (
                      <div
                        key={item.sessionId}
                        className="rounded-xl border px-3 py-2.5 text-sm"
                      >
                        <p className="font-medium">{item.user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.user.email} · {formatDateTime(item.lastSeenAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={confirm != null}
        onOpenChange={(next) => {
          if (!next) setConfirm(null)
        }}
      >
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCopy?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              variant={
                confirm?.kind === "block" || confirm?.kind === "revoke"
                  ? "destructive"
                  : "default"
              }
              onClick={() => void runConfirmed()}
            >
              {busy ? "…" : confirmCopy?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
