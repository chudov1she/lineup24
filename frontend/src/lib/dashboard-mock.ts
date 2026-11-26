export type BetResult = 'PENDING' | 'WON' | 'LOST'

export type MockBet = {
  id: string
  title: string
  forecast: string
  odds: number
  score: string | null
  comment: string | null
  result: BetResult
  publishedAt: string
}

export type MockSubscription = {
  id: string
  plan: 'BANK_BOOST' | 'MONTHLY'
  status: 'ACTIVE' | 'COMPLETED' | 'REVOKED'
  priceRubAtGrant: number
  startsAt: string
  endsAt: string | null
  bankStartRub: number | null
  bankCurrentRub: number | null
  bankTargetRub: number | null
  isActive: boolean
}

export type ChartPoint = {
  date: string
  bank: number
}

export type BankChartRange = '24h' | '7d' | '30d'

/** Fixed stake for mock bank progression (lands on current bank). */
const BANK_UNIT_STAKE = 62

/** «Сейчас» для мок-графика — согласовано с датами ставок. */
export const mockChartNow = '2026-11-18T18:00:00.000Z'

export const mockUser = {
  name: 'nikita',
  email: 'nikita@lineup24.ru',
  avatar: '',
  emailVerifiedAt: '2026-10-12T10:00:00.000Z',
  notifications: {
    emailSignals: true,
    telegramSignals: false,
  },
  telegram: {
    linked: false,
    username: null as string | null,
    botUsername: 'lineup24_bot',
    botUrl: 'https://t.me/lineup24_bot',
  },
}

export type MockSession = {
  id: string
  label: string
  platform: string
  lastSeenAt: string
  current: boolean
}

export const mockSessions: MockSession[] = [
  {
    id: 'sess_current',
    label: 'Windows · Chrome',
    platform: 'Desktop',
    lastSeenAt: '2026-11-18T18:00:00.000Z',
    current: true,
  },
  {
    id: 'sess_phone',
    label: 'iPhone · Safari',
    platform: 'Mobile',
    lastSeenAt: '2026-11-17T21:40:00.000Z',
    current: false,
  },
  {
    id: 'sess_old',
    label: 'macOS · Firefox',
    platform: 'Desktop',
    lastSeenAt: '2026-11-10T09:15:00.000Z',
    current: false,
  },
]

export const mockProducts = [
  {
    code: 'BANK_BOOST' as const,
    title: 'Буст банка +30%',
    priceRub: 1000,
    description:
      'Стартовый банк 1000. Доступ активен, пока банк не вырастет на 30% (до 1300).',
    features: [
      'Старт банка 1000 усл. ед.',
      'Цель +30% → 1300',
      'Доступ, пока банк не дойдёт до цели',
      'Все актуальные сигналы',
    ],
  },
  {
    code: 'MONTHLY' as const,
    title: 'Линия на 30 дней',
    priceRub: 7777,
    description: 'Полный доступ на 30 дней без ограничений по банку.',
    features: [
      'Фиксированные 30 дней',
      'Без лимита по банку',
      'Все актуальные сигналы',
      'История выдач сохраняется',
    ],
  },
]

export const mockSubscriptionHistory: MockSubscription[] = [
  {
    id: 'sub_old_1',
    plan: 'BANK_BOOST',
    status: 'COMPLETED',
    priceRubAtGrant: 1000,
    startsAt: '2026-08-01T09:00:00.000Z',
    endsAt: null,
    bankStartRub: 1000,
    bankCurrentRub: 1300,
    bankTargetRub: 1300,
    isActive: false,
  },
  {
    id: 'sub_old_2',
    plan: 'MONTHLY',
    status: 'COMPLETED',
    priceRubAtGrant: 7777,
    startsAt: '2026-09-01T09:00:00.000Z',
    endsAt: '2026-10-01T09:00:00.000Z',
    bankStartRub: null,
    bankCurrentRub: null,
    bankTargetRub: null,
    isActive: false,
  },
  {
    id: 'sub_active',
    plan: 'BANK_BOOST',
    status: 'ACTIVE',
    priceRubAtGrant: 1000,
    startsAt: '2026-10-20T09:00:00.000Z',
    endsAt: null,
    bankStartRub: 1000,
    bankCurrentRub: 1184,
    bankTargetRub: 1300,
    isActive: true,
  },
]

export const mockSubscriptionMe = {
  hasActiveSubscription: true,
  activePlans: ['BANK_BOOST'] as Array<'BANK_BOOST' | 'MONTHLY'>,
  activeSubscriptions: mockSubscriptionHistory.filter((s) => s.isActive),
  history: mockSubscriptionHistory,
  seats: { used: 47, limit: 100 },
}

export const mockBets: MockBet[] = [
  {
    id: 'b1',
    title: 'Реал — Барселона',
    forecast: 'ТБ 2.5',
    odds: 1.92,
    score: '3:2',
    comment:
      'Классика с высокой результативностью. Обе команды идут через фланги, ждём от 3 голов.',
    result: 'WON',
    publishedAt: '2026-10-21T18:00:00.000Z',
  },
  {
    id: 'b2',
    title: 'Арсенал — Челси',
    forecast: 'П1',
    odds: 2.05,
    score: '1:1',
    comment:
      'Арсенал фаворит дома, но Челси плотно играет в центре. П1 с натяжкой — риск на ничью.',
    result: 'LOST',
    publishedAt: '2026-10-23T17:30:00.000Z',
  },
  {
    id: 'b3',
    title: 'Бавария — Дортмунд',
    forecast: 'ОЗ — да',
    odds: 1.78,
    score: '2:1',
    comment:
      'Обе забьют почти всегда в этом дерби. Линии обороны пропускают на стандартах.',
    result: 'WON',
    publishedAt: '2026-10-25T16:00:00.000Z',
  },
  {
    id: 'b4',
    title: 'Интер — Милан',
    forecast: 'ТМ 3.5',
    odds: 1.7,
    score: '1:0',
    comment:
      'Дерби под тотал меньше: осторожный темп, много борьбы, мало чистых моментов.',
    result: 'WON',
    publishedAt: '2026-10-28T19:00:00.000Z',
  },
  {
    id: 'b5',
    title: 'ПСЖ — Марсель',
    forecast: 'П1 + ТБ 1.5',
    odds: 2.2,
    score: '0:1',
    comment:
      'ПСЖ без половины основы. Марсель мотивирован — фаворит не оправдал.',
    result: 'LOST',
    publishedAt: '2026-10-30T20:00:00.000Z',
  },
  {
    id: 'b6',
    title: 'Ливерпуль — МЮ',
    forecast: 'ТБ 2.5',
    odds: 1.85,
    score: '4:1',
    comment:
      'Ливерпуль давит дома. МЮ открытый — тотал выше выглядит рабочим.',
    result: 'WON',
    publishedAt: '2026-11-02T17:00:00.000Z',
  },
  {
    id: 'b7',
    title: 'Наполи — Ювентус',
    forecast: 'X',
    odds: 3.1,
    score: '2:2',
    comment: 'Равная пара, ставка на ничью по форме последних очных.',
    result: 'WON',
    publishedAt: '2026-11-05T19:45:00.000Z',
  },
  {
    id: 'b8',
    title: 'Атлетико — Севилья',
    forecast: 'П1',
    odds: 1.65,
    score: '0:0',
    comment: 'Атлетико дома обычно засушливый матч; сюрприз по счёту.',
    result: 'LOST',
    publishedAt: '2026-11-08T18:15:00.000Z',
  },
  {
    id: 'b12',
    title: 'Леверкузен — Лейпциг',
    forecast: 'ТМ 3.5',
    odds: 1.68,
    score: '2:1',
    comment:
      'Леверкузен контролирует мяч, Лейпциг бьёт контрвыпады — ТМ 3.5 ок.',
    result: 'WON',
    publishedAt: '2026-11-10T17:00:00.000Z',
  },
  {
    id: 'b13',
    title: 'Рома — Лацио',
    forecast: 'П1',
    odds: 2.15,
    score: '1:2',
    comment: 'Римское дерби: эмоции выше класса. П1 не зашёл.',
    result: 'LOST',
    publishedAt: '2026-11-12T20:00:00.000Z',
  },
  {
    id: 'b15',
    title: 'Шахтёр — Динамо',
    forecast: 'П1',
    odds: 1.95,
    score: '2:0',
    comment: 'Доминирование Шахтёра по xG. П1 уверенный.',
    result: 'WON',
    publishedAt: '2026-11-01T14:00:00.000Z',
  },
  {
    id: 'b9',
    title: 'Тоттенхэм — Ньюкасл',
    forecast: 'ТБ 2.5',
    odds: 1.95,
    score: null,
    comment: 'Ньюкасл пропускает много на выезде. ТБ 2.5 — основной вход.',
    result: 'PENDING',
    publishedAt: '2026-11-15T16:00:00.000Z',
  },
  {
    id: 'b10',
    title: 'Бенфика — Порту',
    forecast: 'ОЗ — да',
    odds: 1.72,
    score: null,
    comment: 'Португальское дерби почти всегда с голами с обеих сторон.',
    result: 'PENDING',
    publishedAt: '2026-11-16T19:00:00.000Z',
  },
  {
    id: 'b11',
    title: 'Аякс — ПСВ',
    forecast: 'П2',
    odds: 2.4,
    score: null,
    comment: 'ПСВ в лучшей форме сезона. П2 на дистанции выглядит ценным.',
    result: 'PENDING',
    publishedAt: '2026-11-17T18:30:00.000Z',
  },
  {
    id: 'b14',
    title: 'Спортинг — Брага',
    forecast: 'ТБ 2.5',
    odds: 1.88,
    score: null,
    comment: 'Спортинг дома любит забивать. Ждём открытый матч.',
    result: 'PENDING',
    publishedAt: '2026-11-18T15:00:00.000Z',
  },
  {
    id: 'b16',
    title: 'Милан — Наполи',
    forecast: 'П1',
    odds: 2.1,
    score: null,
    comment: 'Милан стабильнее дома. Наполи в кризисе атаки — П1.',
    result: 'PENDING',
    publishedAt: '2026-11-18T10:30:00.000Z',
  },
  {
    id: 'b17',
    title: 'Челси — Брайтон',
    forecast: 'ТМ 3.5',
    odds: 1.74,
    score: null,
    comment: 'Брайтон много бьёт, но Челси дома режет темп. ТМ 3.5.',
    result: 'PENDING',
    publishedAt: '2026-11-17T12:00:00.000Z',
  },
  {
    id: 'b18',
    title: 'Севилья — Вильярреал',
    forecast: 'ОЗ — да',
    odds: 1.81,
    score: null,
    comment: 'Оба клуба пропускают через центр. ОЗ — да.',
    result: 'PENDING',
    publishedAt: '2026-11-16T09:00:00.000Z',
  },
  {
    id: 'b19',
    title: 'Марсель — Лион',
    forecast: 'П1 + ТБ 1.5',
    odds: 2.35,
    score: null,
    comment: 'Марсель дома голевой. Лион нестабилен — экспресс-исход.',
    result: 'PENDING',
    publishedAt: '2026-11-15T11:20:00.000Z',
  },
]

/**
 * События банка: старт подписки → каждое закрытие ставки.
 * WON: +stake*(odds-1), LOST: −stake.
 */
export function buildBankEvents(): ChartPoint[] {
  const active = mockSubscriptionMe.activeSubscriptions[0]
  const startAt = active?.startsAt ?? '2026-10-20T09:00:00.000Z'
  const startBank = active?.bankStartRub ?? 1000
  const startMs = new Date(startAt).getTime()

  let bank = startBank
  const events: ChartPoint[] = [{ date: startAt, bank }]

  const settled = mockBets
    .filter((b) => b.result === 'WON' || b.result === 'LOST')
    .filter((b) => new Date(b.publishedAt).getTime() >= startMs)
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))

  for (const bet of settled) {
    bank =
      bet.result === 'WON'
        ? bank + Math.round(BANK_UNIT_STAKE * (bet.odds - 1))
        : Math.max(0, bank - BANK_UNIT_STAKE)
    events.push({ date: bet.publishedAt, bank })
  }

  return events
}

function bankAt(timestampMs: number, events: ChartPoint[]): number {
  let value = events[0]?.bank ?? 1000
  for (const event of events) {
    if (new Date(event.date).getTime() <= timestampMs) {
      value = event.bank
    } else {
      break
    }
  }
  return value
}

function rangeMs(range: BankChartRange): number {
  switch (range) {
    case '24h':
      return 24 * 60 * 60 * 1000
    case '7d':
      return 7 * 24 * 60 * 60 * 1000
    case '30d':
      return 30 * 24 * 60 * 60 * 1000
  }
}

function stepMs(range: BankChartRange): number {
  switch (range) {
    case '24h':
      return 60 * 60 * 1000
    case '7d':
      return 12 * 60 * 60 * 1000
    case '30d':
      return 24 * 60 * 60 * 1000
  }
}

/** Дискретная серия банка для выбранного окна. */
export function getBankChartSeries(range: BankChartRange): ChartPoint[] {
  const events = buildBankEvents()
  const nowMs = new Date(mockChartNow).getTime()
  const subscriptionStartMs = new Date(events[0]!.date).getTime()
  // Не рисуем «до старта подписки» — первая точка = старт банка (1000)
  const windowStart = Math.max(nowMs - rangeMs(range), subscriptionStartMs)
  const step = stepMs(range)
  const points: ChartPoint[] = []

  points.push({
    date: new Date(windowStart).toISOString(),
    bank: bankAt(windowStart, events),
  })

  for (let t = windowStart + step; t < nowMs; t += step) {
    points.push({
      date: new Date(t).toISOString(),
      bank: bankAt(t, events),
    })
  }

  points.push({
    date: new Date(nowMs).toISOString(),
    bank: bankAt(nowMs, events),
  })

  // Скачки по закрытым ставкам внутри окна
  for (const event of events) {
    const ts = new Date(event.date).getTime()
    if (ts <= windowStart || ts >= nowMs) continue
    const already = points.some(
      (p) => Math.abs(new Date(p.date).getTime() - ts) < 60_000,
    )
    if (!already) {
      points.push(event)
    }
  }

  return points.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
}

/** @deprecated use getBankChartSeries — оставлено для совместимости импортов */
export const mockChartSeries = getBankChartSeries('30d')

export const mockKpis = {
  winRate: {
    value: '58%',
    trend: '+4.2%',
    up: true,
    summary: 'Выигрыши среди закрытых',
    hint: 'к прошлому периоду',
  },
  avgOdds: {
    value: '1.94',
    trend: '+0.08',
    up: true,
    summary: 'Средний коэффициент сигналов',
    hint: 'по опубликованным за период',
  },
  pending: {
    value: '8',
    trend: '+2',
    up: true,
    summary: 'Ждут результата',
    hint: 'открыто сейчас',
  },
  bank: {
    value: 1184,
    trend: '+18.4%',
    up: true,
    summary: 'От старта 1000',
    hint: 'цель 1300',
    withCoins: true,
  },
}

export function pendingBets() {
  return mockBets
    .filter((b) => b.result === 'PENDING')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function allBets() {
  return [...mockBets].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export { resultLabel } from '@/lib/api'

export function planLabel(plan: 'BANK_BOOST' | 'MONTHLY') {
  return plan === 'BANK_BOOST' ? 'Буст банка +30%' : 'Линия на 30 дней'
}

export { formatDateTime as formatDate, formatDay } from '@/lib/datetime'

