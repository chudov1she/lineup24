"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react"

import { useAuthSession } from "@/components/auth/auth-session"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  PASSWORD_PLACEHOLDER,
  PasswordFieldLabel,
} from "@/components/ui/password-field"
import { PasswordInput } from "@/components/ui/password-input"
import { toast } from "@/components/ui/toast"
import { plans } from "@/data/site"
import { ApiError, authApi, type SubscriptionPlan } from "@/lib/api"
import { mapAuthError, validatePasswordStrength } from "@/lib/auth-errors"
import { getDeviceMeta } from "@/lib/device-fingerprint"
import { cn } from "@/lib/utils"

export type AuthMode = "login" | "register" | "verify" | "forgot" | "reset"

type LoginFormProps = {
  className?: string
  mode: AuthMode
  planCode?: SubscriptionPlan | null
  onModeChange: (mode: AuthMode) => void
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function LoginForm({
  className,
  mode,
  planCode = null,
  onModeChange,
}: LoginFormProps) {
  const router = useRouter()
  const { refreshUser } = useAuthSession()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [code, setCode] = useState("")
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const planLabel = plans.find((plan) => plan.code === planCode)?.label
  const submitDisabled =
    loading || (mode === "register" && !legalAccepted)

  function goBack() {
    setError(null)
    setInfo(null)
    if (mode === "reset") {
      setCode("")
      setNewPassword("")
      setConfirmNewPassword("")
      onModeChange("forgot")
      return
    }
    if (mode === "forgot") {
      onModeChange("login")
      return
    }
    if (mode === "verify") {
      setCode("")
      onModeChange("login")
    }
  }

  function validate(): string | null {
    if (mode === "login") {
      if (!email.trim()) return "Укажите email"
      if (!isValidEmail(email.trim())) return "Некорректный email"
      if (!password) return "Укажите пароль"
    }

    if (mode === "register") {
      if (!username.trim()) return "Укажите имя пользователя"
      if (username.trim().length < 3) {
        return "Имя пользователя — минимум 3 символа"
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        return "Имя пользователя: только латиница, цифры и _"
      }
      if (!email.trim()) return "Укажите email"
      if (!isValidEmail(email.trim())) return "Некорректный email"
      const passwordError = validatePasswordStrength(password)
      if (passwordError) return passwordError
      if (!legalAccepted) {
        return "Примите пользовательское соглашение и политику конфиденциальности"
      }
    }

    if (mode === "forgot") {
      if (!email.trim()) return "Укажите email"
      if (!isValidEmail(email.trim())) return "Некорректный email"
    }

    if (mode === "verify") {
      if (!code.trim()) return "Введите код из письма"
      if (!/^\d{6}$/.test(code.trim())) return "Код должен состоять из 6 цифр"
    }

    if (mode === "reset") {
      if (!email.trim()) return "Укажите email"
      if (!code.trim()) return "Введите код из письма"
      if (!/^\d{6}$/.test(code.trim())) return "Код должен состоять из 6 цифр"
      const passwordError = validatePasswordStrength(newPassword)
      if (passwordError) {
        return passwordError.replace("Укажите пароль", "Укажите новый пароль")
      }
      if (!confirmNewPassword) return "Подтвердите новый пароль"
      if (newPassword !== confirmNewPassword) {
        return "Пароли не совпадают"
      }
    }

    return null
  }

  async function finishAuth(selectedPlan: SubscriptionPlan | null) {
    await refreshUser()
    router.push(selectedPlan ? "/dashboard/subscription" : "/dashboard")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfo(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const device = getDeviceMeta()

      if (mode === "login") {
        const result = await authApi.login({
          email: email.trim(),
          password,
          ...device,
        })
        await refreshUser()
        if (!result.user.emailVerifiedAt) {
          onModeChange("verify")
          setInfo("Подтвердите email — код уже отправлен на почту.")
          return
        }
        toast.add({ title: "Вы вошли в аккаунт", type: "success" })
        await finishAuth(planCode)
        return
      }

      if (mode === "register") {
        const result = await authApi.register({
          username: username.trim(),
          email: email.trim(),
          password,
          tosAccepted: true,
          privacyAccepted: true,
          ...device,
        })
        await refreshUser()
        onModeChange("verify")
        setInfo(
          result.verificationCode
            ? `Код отправлен. Для отладки: ${result.verificationCode}`
            : "Код подтверждения отправлен на почту.",
        )
        toast.add({
          title: "Аккаунт создан — подтвердите email",
          type: "success",
        })
        return
      }

      if (mode === "verify") {
        await authApi.verifyEmail({ code: code.trim() })
        toast.add({ title: "Email подтверждён", type: "success" })
        await finishAuth(planCode)
        return
      }

      if (mode === "forgot") {
        const result = await authApi.forgotPassword({ email: email.trim() })
        if (!result.sent) {
          setError(
            "Аккаунт с таким email не найден. Восстановление пароля недоступно.",
          )
          return
        }
        onModeChange("reset")
        setInfo(
          result.code
            ? `Код отправлен. Для отладки: ${result.code}`
            : "Код для сброса пароля отправлен на почту.",
        )
        return
      }

      if (mode === "reset") {
        await authApi.resetPassword({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        })
        toast.add({ title: "Пароль обновлён", type: "success" })
        setPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
        setCode("")
        onModeChange("login")
        setInfo("Теперь войдите с новым паролем.")
      }
    } catch (err) {
      if (err instanceof ApiError && err.isRateLimited) {
        // api() already shows a warning toast — don't block the form.
        return
      }
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function resendCode() {
    setError(null)
    setLoading(true)
    try {
      const result = await authApi.resendVerification()
      setInfo(
        result.verificationCode
          ? `Новый код отправлен. Для отладки: ${result.verificationCode}`
          : "Новый код отправлен на почту.",
      )
    } catch (err) {
      if (err instanceof ApiError && err.isRateLimited) {
        return
      }
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === "login"
      ? "Вход в аккаунт"
      : mode === "register"
        ? "Регистрация"
        : mode === "verify"
          ? "Подтверждение email"
          : mode === "forgot"
            ? "Забыли пароль"
            : "Новый пароль"

  const description =
    mode === "login"
      ? "Email и пароль — чтобы открыть кабинет и актуальную линию."
      : mode === "register"
        ? planLabel
          ? `Создайте аккаунт, чтобы оформить тариф «${planLabel}».`
          : "Создайте аккаунт, чтобы оформить тариф и открыть линию."
        : mode === "verify"
          ? "Введите 6-значный код из письма."
          : mode === "forgot"
            ? "Укажите email аккаунта — пришлём код для сброса пароля."
            : "Введите код из письма и задайте новый пароль дважды."

  const backLabel =
    mode === "reset"
      ? "Назад к email"
      : mode === "forgot"
        ? "Назад ко входу"
        : mode === "verify"
          ? "Назад ко входу"
          : null

  const submitLabel = loading
    ? "Подождите…"
    : mode === "login"
      ? "Войти"
      : mode === "register"
        ? "Создать аккаунт"
        : mode === "verify"
          ? "Подтвердить"
          : mode === "forgot"
            ? "Отправить код"
            : "Сохранить пароль"

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="dark overflow-hidden border-0 bg-ink p-0 text-white shadow-xl ring-1 ring-ink/20">
        <CardContent className="p-0">
          <form className="p-6 md:p-8" onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <FieldGroup>
                  {backLabel ? (
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center gap-1.5 self-start text-sm text-white/55 transition-colors hover:text-white"
                    >
                      <ArrowLeftIcon className="size-4" />
                      {backLabel}
                    </button>
                  ) : null}

                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="font-heading text-2xl font-semibold tracking-tight text-white">
                      {title}
                    </h1>
                    <p className="text-sm text-balance text-white/55">
                      {description}
                    </p>
                  </div>

                  {mode === "register" ? (
                    <Field>
                      <FieldLabel htmlFor="username" className="text-white/70">
                        Имя пользователя
                      </FieldLabel>
                      <Input
                        id="username"
                        minLength={3}
                        maxLength={32}
                        pattern="[a-zA-Z0-9_]+"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        placeholder="latin_letters_123"
                        className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
                      />
                    </Field>
                  ) : null}

                  {mode === "login" ||
                  mode === "register" ||
                  mode === "forgot" ||
                  mode === "reset" ? (
                    <Field>
                      <FieldLabel htmlFor="email" className="text-white/70">
                        Email
                      </FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        placeholder="you@email.com"
                        readOnly={mode === "reset"}
                        className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
                      />
                    </Field>
                  ) : null}

                  {mode === "login" || mode === "register" ? (
                    <Field>
                      <PasswordFieldLabel
                        htmlFor="password"
                        hint={mode === "register"}
                        labelClassName="text-white/70"
                        hintTriggerClassName="text-white/45 hover:text-white/80"
                        trailing={
                          mode === "login" ? (
                            <button
                              type="button"
                              className="text-sm text-white/55 underline-offset-2 hover:text-white hover:underline"
                              onClick={() => {
                                setError(null)
                                setInfo(null)
                                onModeChange("forgot")
                              }}
                            >
                              Забыли пароль?
                            </button>
                          ) : null
                        }
                      >
                        Пароль
                      </PasswordFieldLabel>
                      <PasswordInput
                        id="password"
                        minLength={8}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        placeholder={PASSWORD_PLACEHOLDER}
                        className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
                        toggleClassName="text-white/45 hover:text-white"
                      />
                    </Field>
                  ) : null}

                  {mode === "verify" || mode === "reset" ? (
                    <Field>
                      <FieldLabel htmlFor="code" className="text-white/70">
                        Код из письма
                      </FieldLabel>
                      <Input
                        id="code"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(event) =>
                          setCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="123456"
                        autoComplete="one-time-code"
                        className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
                      />
                    </Field>
                  ) : null}

                  {mode === "reset" ? (
                    <>
                      <Field>
                        <PasswordFieldLabel
                          htmlFor="new-password"
                          hint
                          labelClassName="text-white/70"
                          hintTriggerClassName="text-white/45 hover:text-white/80"
                        >
                          Новый пароль
                        </PasswordFieldLabel>
                        <PasswordInput
                          id="new-password"
                          minLength={8}
                          value={newPassword}
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                          autoComplete="new-password"
                          placeholder={PASSWORD_PLACEHOLDER}
                          className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
                          toggleClassName="text-white/45 hover:text-white"
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor="confirm-new-password"
                          className="text-white/70"
                        >
                          Подтверждение пароля
                        </FieldLabel>
                        <PasswordInput
                          id="confirm-new-password"
                          minLength={8}
                          value={confirmNewPassword}
                          onChange={(event) =>
                            setConfirmNewPassword(event.target.value)
                          }
                          autoComplete="new-password"
                          placeholder={PASSWORD_PLACEHOLDER}
                          className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
                          toggleClassName="text-white/45 hover:text-white"
                        />
                      </Field>
                    </>
                  ) : null}

                  {mode === "register" ? (
                    <Field>
                      <label className="flex items-start gap-2 text-sm leading-snug text-white/65">
                        <Checkbox
                          checked={legalAccepted}
                          onCheckedChange={(checked) =>
                            setLegalAccepted(checked === true)
                          }
                          className="mt-0.5 border-white/30 data-checked:border-white data-checked:bg-white data-checked:text-ink"
                        />
                        <span>
                          Принимаю{" "}
                          <Link
                            href="/user_agreement"
                            className="text-white underline underline-offset-4"
                            target="_blank"
                          >
                            пользовательское соглашение
                          </Link>
                          ,{" "}
                          <Link
                            href="/privacy_policy"
                            className="text-white underline underline-offset-4"
                            target="_blank"
                          >
                            политику конфиденциальности
                          </Link>{" "}
                          и{" "}
                          <Link
                            href="/cookie_policy"
                            className="text-white underline underline-offset-4"
                            target="_blank"
                          >
                            политику cookie
                          </Link>
                        </span>
                      </label>
                    </Field>
                  ) : null}

                  {error ? (
                    <Alert
                      variant="destructive"
                      className="border-[oklch(0.65_0.16_25/0.35)] bg-[oklch(0.55_0.16_25/0.18)] text-[oklch(0.86_0.08_25)]"
                    >
                      <AlertCircleIcon />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}

                  {info ? (
                    <Alert className="border-white/10 bg-white/5 text-white/75">
                      <AlertDescription>{info}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Field>
                    <Button
                      type="submit"
                      disabled={submitDisabled}
                      className={cn(
                        "w-full border-0 bg-white text-ink hover:bg-white/90",
                        "disabled:bg-white/20 disabled:text-white/40 disabled:opacity-100",
                      )}
                    >
                      {submitLabel}
                    </Button>
                  </Field>

                  {mode === "verify" ? (
                    <FieldDescription className="text-center text-white/50">
                      Не пришло письмо?{" "}
                      <button
                        type="button"
                        className="text-white underline underline-offset-4"
                        disabled={loading}
                        onClick={() => void resendCode()}
                      >
                        Отправить снова
                      </button>
                    </FieldDescription>
                  ) : null}

                  {mode === "login" ? (
                    <FieldDescription className="text-center text-white/50">
                      Нет аккаунта?{" "}
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-white underline underline-offset-4 transition-colors hover:text-white/70"
                        onClick={() => {
                          setError(null)
                          setInfo(null)
                          onModeChange("register")
                        }}
                      >
                        Зарегистрироваться
                      </button>
                    </FieldDescription>
                  ) : null}

                  {mode === "register" ? (
                    <FieldDescription className="text-center text-white/50">
                      Уже есть аккаунт?{" "}
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-white underline underline-offset-4 transition-colors hover:text-white/70"
                        onClick={() => {
                          setError(null)
                          setInfo(null)
                          onModeChange("login")
                        }}
                      >
                        Войти
                      </button>
                    </FieldDescription>
                  ) : null}
                </FieldGroup>
              </motion.div>
            </AnimatePresence>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center text-ink/45">
        Нажимая «
        {mode === "login"
          ? "Войти"
          : mode === "register"
            ? "Создать аккаунт"
            : "Продолжить"}
        », вы соглашаетесь с{" "}
        <Link
          href="/user_agreement"
          className="underline underline-offset-4 hover:text-ink"
          target="_blank"
        >
          пользовательским соглашением
        </Link>
        ,{" "}
        <Link
          href="/privacy_policy"
          className="underline underline-offset-4 hover:text-ink"
          target="_blank"
        >
          политикой конфиденциальности
        </Link>{" "}
        и{" "}
        <Link
          href="/cookie_policy"
          className="underline underline-offset-4 hover:text-ink"
          target="_blank"
        >
          политикой cookie
        </Link>
        .
      </FieldDescription>
    </div>
  )
}
