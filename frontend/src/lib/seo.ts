import type { Metadata } from "next"

import { BRAND } from "@/lib/brand"

export function pageMetadata(
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} · ${BRAND.name}`,
      description,
    },
    twitter: {
      title: `${title} · ${BRAND.name}`,
      description,
    },
  }
}

/** Public marketing / legal pages */
export const sitePages = {
  home: {
    title: {
      absolute: `${BRAND.name} — ${BRAND.tagline}`,
    },
    description:
      "Спортивная аналитика и рабочая линия ставок. Открытый архив исходов — без шума и обещаний.",
    openGraph: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description:
        "Спортивная аналитика и рабочая линия ставок. Открытый архив исходов — без шума и обещаний.",
    },
    twitter: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description:
        "Спортивная аналитика и рабочая линия ставок. Открытый архив исходов — без шума и обещаний.",
    },
  } satisfies Metadata,
  pricing: pageMetadata(
    "Тарифы",
    "Буст банка и линия на 30 дней. Выберите формат доступа к аналитике lineup24.",
  ),
  stats: pageMetadata(
    "Статистика",
    "Открытый архив закрытых прогнозов lineup24 — матч, коэффициент, счёт, результат.",
  ),
  contacts: pageMetadata(
    "Контакты",
    "Связь с поддержкой lineup24. Ответим по email и в Telegram.",
  ),
  privacy: pageMetadata(
    "Конфиденциальность",
    "Как lineup24 обрабатывает и защищает персональные данные.",
  ),
  agreement: pageMetadata(
    "Соглашение",
    "Правила пользования сервисом lineup24 и условия доступа к материалам.",
  ),
  partnership: pageMetadata(
    "Публичная оферта",
    "Условия оплаты и предоставления доступа к материалам lineup24.",
  ),
  cookies: pageMetadata(
    "Политика cookie",
    "Как lineup24 использует файлы cookie и сходные технологии.",
  ),
  login: pageMetadata(
    "Вход",
    "Войдите в кабинет lineup24, чтобы открыть линию и архив сигналов.",
  ),
  signup: pageMetadata(
    "Регистрация",
    "Создайте аккаунт lineup24 и подключите доступ к рабочей линии.",
  ),
  register: pageMetadata(
    "Регистрация",
    "Создайте аккаунт lineup24 и подключите доступ к рабочей линии.",
  ),
} as const

/** Dashboard / cabinet pages */
export const dashboardPages = {
  overview: pageMetadata(
    "Обзор",
    "Сводка по линии, банку и активности в кабинете lineup24.",
  ),
  signals: pageMetadata(
    "Сигналы",
    "Текущая линия и история сигналов в кабинете lineup24.",
  ),
  subscription: pageMetadata(
    "Подписка",
    "Тариф, статус доступа и продление подписки lineup24.",
  ),
  settings: pageMetadata(
    "Настройки",
    "Профиль, уведомления и безопасность аккаунта lineup24.",
  ),
  users: pageMetadata(
    "Пользователи",
    "Управление пользователями и доступами lineup24.",
  ),
  manageBets: pageMetadata(
    "Управление ставками",
    "Создание и редактирование сигналов рабочей линии.",
  ),
  broadcasts: pageMetadata(
    "Рассылки",
    "Массовые и личные сообщения подписчикам lineup24.",
  ),
  metrics: pageMetadata(
    "Метрики",
    "Посещения, аудитория и показатели продукта lineup24.",
  ),
} as const
