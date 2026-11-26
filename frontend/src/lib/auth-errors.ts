import { ApiError } from "@/lib/api"

/** Strong password: 8+, letter, digit, special. */
export const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,128}$/

export const PASSWORD_HINT =
  "Минимум 8 символов, буква, цифра и спецсимвол (!@#…)"

export function validatePasswordStrength(password: string): string | null {
  if (!password) return "Укажите пароль"
  if (password.length < 8) {
    return "Пароль должен быть не короче 8 символов"
  }
  if (!/[A-Za-z]/.test(password)) {
    return "В пароле нужна хотя бы одна буква"
  }
  if (!/\d/.test(password)) {
    return "В пароле нужна хотя бы одна цифра"
  }
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "В пароле нужен хотя бы один спецсимвол (!@#$% и т.п.)"
  }
  if (password.length > 128) {
    return "Пароль не должен быть длиннее 128 символов"
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return PASSWORD_HINT
  }
  return null
}

const KNOWN_ERRORS: Record<string, string> = {
  "Invalid email or password":
    "Неверный email или пароль. Проверьте данные или восстановите пароль.",
  "Account is blocked":
    "Аккаунт заблокирован. Напишите в поддержку: support@lineup24.ru",
  "Email is already registered":
    "Этот email уже зарегистрирован. Войдите или восстановите пароль.",
  "Username is already taken":
    "Это имя пользователя уже занято. Выберите другое.",
  "Legal documents must be accepted":
    "Примите пользовательское соглашение и политику конфиденциальности",
  "Terms of service must be accepted":
    "Примите пользовательское соглашение",
  "Privacy policy must be accepted": "Примите политику конфиденциальности",
  "Current password is incorrect": "Текущий пароль указан неверно",
  "Email is already in use": "Этот email уже используется",
  "Invalid or expired code": "Неверный или просроченный код",
  "Invalid or expired verification code":
    "Неверный или просроченный код подтверждения",
  "Invalid or expired reset code":
    "Неверный или просроченный код сброса пароля",
  "Email is already verified": "Email уже подтверждён",
  "Request failed": "Не удалось выполнить запрос. Попробуйте ещё раз.",
}

function translateOne(raw: string): string {
  const trimmed = raw.trim()
  if (KNOWN_ERRORS[trimmed]) return KNOWN_ERRORS[trimmed]

  const lower = trimmed.toLowerCase()
  if (lower.includes("invalid email or password")) {
    return KNOWN_ERRORS["Invalid email or password"]
  }
  if (lower.includes("email") && lower.includes("already")) {
    return KNOWN_ERRORS["Email is already registered"]
  }
  if (lower.includes("username") && lower.includes("taken")) {
    return KNOWN_ERRORS["Username is already taken"]
  }
  if (lower.includes("must be an email")) {
    return "Укажите корректный email"
  }
  if (lower.includes("password") && lower.includes("longer")) {
    return PASSWORD_HINT
  }

  // Prefer Russian backend messages as-is.
  if (/[А-Яа-яЁё]/.test(trimmed)) return trimmed

  return "Не удалось выполнить запрос. Проверьте данные и попробуйте снова."
}

/** Map API / network errors to clear Russian copy for auth forms. */
export function mapAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isRateLimited) {
      return "Слишком много запросов. Подождите немного и попробуйте снова."
    }
    const parts = err.message
      .split(/[;|]/)
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) {
      if (err.status === 401) {
        return KNOWN_ERRORS["Invalid email or password"]
      }
      if (err.status === 409) {
        return "Конфликт данных. Возможно, email или имя уже заняты."
      }
      return "Не удалось выполнить запрос. Попробуйте ещё раз."
    }
    return parts.map(translateOne).join(". ")
  }
  if (err instanceof TypeError) {
    return "Нет связи с сервером. Проверьте интернет и попробуйте снова."
  }
  if (err instanceof Error && err.message) {
    return translateOne(err.message)
  }
  return "Не удалось выполнить запрос. Попробуйте ещё раз."
}
