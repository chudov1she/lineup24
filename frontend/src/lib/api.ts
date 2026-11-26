/** Same-origin by default so ngrok / any public host works without rebuild. */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '/api';

export type Role = 'USER' | 'ADMIN';
export type SubscriptionPlan = 'BANK_BOOST' | 'MONTHLY';
export type BetResult = 'PENDING' | 'WON' | 'LOST';
export type SubscriptionStatusKind = 'ACTIVE' | 'COMPLETED' | 'REVOKED';
export type BroadcastAudience =
  | 'EMAIL_OPTED_IN'
  | 'TELEGRAM_OPTED_IN'
  | 'ACTIVE_SUBSCRIBERS'
  | 'DIRECT_USER';

export type MassBroadcastAudience = Exclude<BroadcastAudience, 'DIRECT_USER'>;

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  blockedAt: string | null;
  tosAcceptedAt: string | null;
  tosVersion: string | null;
  privacyAcceptedAt: string | null;
  privacyVersion: string | null;
  emailSignals: boolean;
  telegramSignals: boolean;
  browserPushSignals: boolean;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailChangePending = {
  newEmail: string;
  step: 'verify-new';
  expiresAt: string;
};

export type MeResponse = PublicUser & {
  hasActiveSubscription: boolean;
  activePlans: SubscriptionPlan[];
  tosCurrentVersion: string;
  privacyCurrentVersion: string;
  needsTosReaccept: boolean;
  telegramLinked: boolean;
  emailChangePending?: EmailChangePending | null;
};

export type EmailChangeStepResponse = {
  ok: true;
  step: 'verify-new';
  newEmail: string;
  expiresAt: string;
  newCode?: string;
};

export type AuthSuccess = {
  user: PublicUser;
  verificationCode?: string;
};

export type SubscriptionProduct = {
  code: SubscriptionPlan;
  title: string;
  priceRub: number;
  description: string | null;
};

export type PublicSubscription = {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatusKind;
  priceRubAtGrant: number;
  startsAt: string;
  endsAt: string | null;
  bankStartRub: number | null;
  bankCurrentRub: number | null;
  bankTargetRub: number | null;
  completedAt: string | null;
  revokedAt: string | null;
  grantedById: string | null;
  createdAt: string;
  isActive: boolean;
};

export type SubscriptionUsagePeriod = {
  subscriptionId: string;
  plan: SubscriptionPlan;
  startsAt: string;
  endsAt: string | null;
};

export type SubscriptionMeResponse = {
  hasActiveSubscription: boolean;
  /** Past or present subscriber — archive/stats for usage windows. */
  hasSubscriptionHistory: boolean;
  activePlans: SubscriptionPlan[];
  activeSubscriptions: PublicSubscription[];
  history: PublicSubscription[];
  usagePeriods: SubscriptionUsagePeriod[];
  seats: { used: number; limit: number };
};

export type Bet = {
  id: string;
  title: string;
  forecast: string;
  odds: number;
  score: string | null;
  comment: string | null;
  result: BetResult;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BetsListResponse = {
  page: number;
  limit: number;
  total: number;
  items: Bet[];
};

export type BetsWatchResponse = {
  /** Newly published bets (toast / unseen). */
  items: Bet[];
  /** Existing bets that changed (settle → bank curve upsert). */
  updated: Bet[];
  deletedIds: string[];
  /** When set, refetch /subscriptions/me for live bank. */
  bankRevision: string | null;
  serverTime: string;
};

export type SessionRow = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  platform: string | null;
  deviceType: string | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  expiresAt: string;
  isActive: boolean;
};

export type BroadcastRecipient = {
  id: string;
  username: string;
  email: string;
};

export type Broadcast = {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  sentCount: number;
  createdAt: string;
  recipient: BroadcastRecipient | null;
};

export type CheckoutResponse = {
  paymentUrl: string;
  orderId: string;
};

const RATE_LIMIT_MESSAGE =
  'Слишком много запросов. Подождите немного и попробуйте снова.';

function parseErrorMessage(data: unknown, status?: number): string {
  if (status === 429) {
    return RATE_LIMIT_MESSAGE;
  }
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') {
      if (/throttler|too many requests/i.test(message)) {
        return RATE_LIMIT_MESSAGE;
      }
      return message;
    }
    if (Array.isArray(message)) return message.join(', ');
  }
  return 'Request failed';
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  code: string | null;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? parseErrorMessage(body, status));
    this.status = status;
    this.body = body;
    this.code =
      typeof body === 'object' &&
      body !== null &&
      'code' in body &&
      typeof (body as { code: unknown }).code === 'string'
        ? (body as { code: string }).code
        : status === 429
          ? 'RATE_LIMITED'
          : null;
  }

  get isRateLimited() {
    return this.status === 429 || this.code === 'RATE_LIMITED';
  }
}

let lastRateLimitToastAt = 0;

function warnRateLimited() {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  // Debounce so polling (watch) does not spam toasts.
  if (now - lastRateLimitToastAt < 4_000) return;
  lastRateLimitToastAt = now;
  void import('@/components/ui/toast').then(({ toast }) => {
    toast.add({
      title: 'Подождите немного',
      description: RATE_LIMIT_MESSAGE,
      type: 'warning',
    });
  });
}

/** Prefer this in catch blocks so 429 is a warning toast, not an error. */
export function toastApiError(
  error: unknown,
  fallback: { title: string; description?: string } = {
    title: 'Не удалось выполнить запрос',
  },
) {
  if (typeof window === 'undefined') return;
  void import('@/components/ui/toast').then(({ toast }) => {
    if (error instanceof ApiError && error.isRateLimited) {
      toast.add({
        title: 'Подождите немного',
        description: RATE_LIMIT_MESSAGE,
        type: 'warning',
      });
      return;
    }
    toast.add({
      title: fallback.title,
      description:
        fallback.description ??
        (error instanceof Error ? error.message : undefined),
      type: 'error',
    });
  });
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip silent refresh+retry (used by refresh itself and auth bootstrap). */
  skipAuthRefresh?: boolean;
};

const NO_REFRESH_PATHS = new Set([
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        await api<{ ok: boolean }>('/auth/refresh', {
          method: 'POST',
          skipAuthRefresh: true,
        });
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, skipAuthRefresh, ...rest } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_URL}${normalizedPath}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const canRefresh =
      response.status === 401 &&
      !skipAuthRefresh &&
      !NO_REFRESH_PATHS.has(normalizedPath);

    if (canRefresh) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return api<T>(path, { ...options, skipAuthRefresh: true });
      }
    }

    const apiError = new ApiError(response.status, data);
    if (apiError.isRateLimited) {
      warnRateLimited();
    }
    throw apiError;
  }

  return data as T;
}

export type DeviceMeta = {
  deviceFingerprint?: string;
  platform?: string;
  deviceType?: string;
};

export const authApi = {
  register(
    body: {
      username: string;
      email: string;
      password: string;
      tosAccepted: boolean;
      privacyAccepted: boolean;
    } & DeviceMeta,
  ) {
    return api<AuthSuccess>('/auth/register', { method: 'POST', body });
  },
  login(body: { email: string; password: string } & DeviceMeta) {
    return api<AuthSuccess>('/auth/login', { method: 'POST', body });
  },
  refresh() {
    return api<{ ok: boolean }>('/auth/refresh', {
      method: 'POST',
      skipAuthRefresh: true,
    });
  },
  logout() {
    return api<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
      skipAuthRefresh: true,
    });
  },
  me() {
    return api<MeResponse>('/auth/me');
  },
  acceptLegal(body: { tosAccepted: boolean; privacyAccepted: boolean }) {
    return api<MeResponse>('/auth/accept-legal', { method: 'POST', body });
  },
  changePassword(body: { currentPassword: string; newPassword: string }) {
    return api<{ ok: boolean }>('/auth/change-password', {
      method: 'POST',
      body,
    });
  },
  changeUsername(body: { username: string }) {
    return api<MeResponse>('/auth/change-username', {
      method: 'POST',
      body,
    });
  },
  startEmailChange(body: { newEmail: string; currentPassword: string }) {
    return api<EmailChangeStepResponse>('/auth/change-email/start', {
      method: 'POST',
      body,
    });
  },
  verifyEmailChangeNew(body: { code: string }) {
    return api<MeResponse>('/auth/change-email/verify-new', {
      method: 'POST',
      body,
    });
  },
  resendEmailChange() {
    return api<EmailChangeStepResponse>('/auth/change-email/resend', {
      method: 'POST',
    });
  },
  cancelEmailChange() {
    return api<{ ok: boolean }>('/auth/change-email/cancel', {
      method: 'POST',
    });
  },
  verifyEmail(body: { code: string }) {
    return api<PublicUser>('/auth/verify-email', { method: 'POST', body });
  },
  resendVerification() {
    return api<AuthSuccess>('/auth/resend-verification', { method: 'POST' });
  },
  forgotPassword(body: { email: string }) {
    return api<{ ok: boolean; sent: boolean; code?: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body,
      },
    );
  },
  resetPassword(body: { email: string; code: string; newPassword: string }) {
    return api<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body,
    });
  },
};

export const subscriptionsApi = {
  products() {
    return api<SubscriptionProduct[]>('/subscriptions/products');
  },
  me() {
    return api<SubscriptionMeResponse>('/subscriptions/me');
  },
  grant(body: { userId: string; plan: SubscriptionPlan }) {
    return api<PublicSubscription>('/subscriptions/grant', {
      method: 'POST',
      body,
    });
  },
  revoke(id: string) {
    return api<PublicSubscription>(`/subscriptions/${id}/revoke`, {
      method: 'POST',
    });
  },
  updateBank(id: string, bankCurrentRub: number) {
    return api<PublicSubscription>(`/subscriptions/${id}/bank`, {
      method: 'PATCH',
      body: { bankCurrentRub },
    });
  },
};

export const paymentsApi = {
  checkout(plan: SubscriptionPlan) {
    return api<CheckoutResponse>('/payments/checkout', {
      method: 'POST',
      body: { plan },
    });
  },
};

export type ArchiveBet = {
  id: string;
  title: string;
  forecast: string;
  odds: number;
  score: string | null;
  result: 'WON' | 'LOST';
  publishedAt: string;
};

export type ArchiveResponse = {
  page: number;
  limit: number;
  total: number;
  won: number;
  lost: number;
  hitRate: number;
  items: ArchiveBet[];
};

export const betsApi = {
  archive(params?: { page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return api<ArchiveResponse>(`/bets/archive${qs ? `?${qs}` : ''}`);
  },
  list(params: {
    page?: number;
    limit?: number;
    result?: BetResult;
    period?: string;
    q?: string;
  }) {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.result) search.set('result', params.result);
    if (params.period) search.set('period', params.period);
    if (params.q?.trim()) search.set('q', params.q.trim());
    const qs = search.toString();
    return api<BetsListResponse>(`/bets${qs ? `?${qs}` : ''}`);
  },
  create(body: {
    title: string;
    forecast: string;
    odds: number;
    score?: string;
    comment?: string;
    result?: BetResult;
  }) {
    return api<Bet>('/bets', { method: 'POST', body });
  },
  update(
    id: string,
    body: Partial<{
      title: string;
      forecast: string;
      odds: number;
      score: string | null;
      comment: string | null;
      result: BetResult;
    }>,
  ) {
    return api<Bet>(`/bets/${id}`, { method: 'PATCH', body });
  },
  remove(id: string) {
    return api<{ ok: boolean }>(`/bets/${id}`, { method: 'DELETE' });
  },
  watch(
    params: { since: string; timeoutMs?: number },
    options?: { signal?: AbortSignal },
  ) {
    const search = new URLSearchParams();
    search.set('since', params.since);
    if (params.timeoutMs != null) {
      search.set('timeoutMs', String(params.timeoutMs));
    }
    return api<BetsWatchResponse>(`/bets/watch?${search.toString()}`, {
      signal: options?.signal,
    });
  },
};

export const sessionsApi = {
  list() {
    return api<SessionRow[]>('/sessions');
  },
  revoke(id: string) {
    return api<{ ok: boolean }>(`/sessions/${id}`, { method: 'DELETE' });
  },
  revokeOthers() {
    return api<{ ok: boolean }>('/sessions/revoke-others', { method: 'POST' });
  },
};

export const notificationsApi = {
  updatePrefs(body: {
    emailSignals?: boolean;
    telegramSignals?: boolean;
    browserPushSignals?: boolean;
  }) {
    return api<{
      emailSignals: boolean;
      telegramSignals: boolean;
      browserPushSignals: boolean;
    }>('/notifications/prefs', { method: 'PATCH', body });
  },
  getVapidPublicKey() {
    return api<{ publicKey: string }>('/notifications/push/vapid-public-key');
  },
  subscribePush(body: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }) {
    return api<{ ok: true; id: string }>('/notifications/push/subscribe', {
      method: 'POST',
      body,
    });
  },
  unsubscribePush(endpoint: string) {
    return api<{ ok: true }>('/notifications/push/subscribe', {
      method: 'DELETE',
      body: { endpoint },
    });
  },
  createTelegramLink() {
    return api<{
      alreadyLinked: boolean;
      deepLink: string | null;
      expiresAt: string | null;
      botUsername: string;
    }>('/notifications/telegram/link', { method: 'POST' });
  },
  bindTelegram(token: string) {
    return api<{ ok: boolean }>('/notifications/telegram/bind', {
      method: 'POST',
      body: { token },
    });
  },
  unbindTelegram() {
    return api<{ ok: boolean }>('/notifications/telegram/unbind', {
      method: 'POST',
    });
  },
  listBroadcasts(params?: {
    q?: string;
    kind?: 'all' | 'mass' | 'direct';
    audience?: MassBroadcastAudience;
  }) {
    const search = new URLSearchParams();
    if (params?.q?.trim()) search.set('q', params.q.trim());
    if (params?.kind && params.kind !== 'all') search.set('kind', params.kind);
    if (params?.audience) search.set('audience', params.audience);
    const qs = search.toString();
    return api<Broadcast[]>(
      `/notifications/broadcasts${qs ? `?${qs}` : ''}`,
    );
  },
  createBroadcast(body: {
    title: string;
    body: string;
    audience: MassBroadcastAudience;
  }) {
    return api<Broadcast>('/notifications/broadcasts', {
      method: 'POST',
      body,
    });
  },
  emailUser(userId: string, body: { title: string; body: string }) {
    return api<{ ok: true; email: string; broadcast: Broadcast }>(
      `/notifications/users/${userId}/email`,
      { method: 'POST', body },
    );
  },
};

export type AdminUserListItem = PublicUser & {
  activePlans: SubscriptionPlan[];
};

export type UsersListResponse = {
  items: AdminUserListItem[];
  total: number;
  skip?: number;
  take?: number;
};

export type UsersListParams = {
  q?: string;
  take?: number;
  skip?: number;
  role?: Role;
  blocked?: boolean;
  hasActiveSubscription?: boolean;
  plan?: SubscriptionPlan;
};

export type AdminUserDetail = {
  user: PublicUser;
  subscriptions: Array<
    PublicSubscription & {
      status: SubscriptionStatusKind;
      bankCurrentRub?: number | null;
      bankTargetRub?: number | null;
      plan: SubscriptionPlan;
    }
  >;
  sessions: Array<Omit<SessionRow, 'isActive'>>;
  fingerprintOverlaps: Array<{
    sessionId: string;
    user: { id: string; username: string; email: string };
    deviceFingerprint: string | null;
    lastSeenAt: string;
  }>;
};

export const usersApi = {
  list(params?: UsersListParams) {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.take) search.set('take', String(params.take));
    if (params?.skip != null) search.set('skip', String(params.skip));
    if (params?.role) search.set('role', params.role);
    if (params?.blocked !== undefined) {
      search.set('blocked', String(params.blocked));
    }
    if (params?.hasActiveSubscription !== undefined) {
      search.set(
        'hasActiveSubscription',
        String(params.hasActiveSubscription),
      );
    }
    if (params?.plan) search.set('plan', params.plan);
    const qs = search.toString();
    return api<UsersListResponse>(`/users${qs ? `?${qs}` : ''}`);
  },
  detail(id: string) {
    return api<AdminUserDetail>(`/users/${id}/detail`);
  },
  update(
    id: string,
    body: {
      role?: Role;
      blockedAt?: 'now' | null;
      username?: string;
      email?: string;
      password?: string;
    },
  ) {
    return api<PublicUser>(`/users/${id}`, { method: 'PATCH', body });
  },
};

export type MetricsDayPoint = {
  date: string;
  value: number;
};

export type MetricsSnapshot = {
  period: { from: string; to: string };
  onlineNow: number;
  activeUsersInPeriod: number;
  usersTotal: number;
  activeSubscriberUsers: number;
  betsTotal: number;
  pendingBets: number;
  blockedUsers: number;
  revenuePaidRub: number;
  revenuePaidInPeriod: number;
  paidOrdersInPeriod: number;
  grantsCount: number;
  grantsRub: number;
  grantsCountInPeriod: number;
  grantsRubInPeriod: number;
  revenueRubProxy: number;
  homepageUniquesToday: number;
  homepageUniquesInPeriod: number;
  hitRate: number;
  seats: { used: number; limit: number };
  betsByResult: {
    PENDING: number;
    WON: number;
    LOST: number;
  };
  series: {
    activityDaily: MetricsDayPoint[];
    usersDaily: MetricsDayPoint[];
    betsDaily: MetricsDayPoint[];
    wonDaily: MetricsDayPoint[];
    lostDaily: MetricsDayPoint[];
    revenuePaidDaily: MetricsDayPoint[];
  };
};

export const metricsApi = {
  snapshot(params?: { from?: string; to?: string }) {
    const search = new URLSearchParams();
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    const qs = search.toString();
    return api<MetricsSnapshot>(`/metrics${qs ? `?${qs}` : ''}`);
  },
};

export const analyticsApi = {
  pageview(path: '/' = '/') {
    return api<{ ok: true }>('/analytics/pageview', {
      method: 'POST',
      body: { path },
      skipAuthRefresh: true,
    });
  },
};

export const TELEGRAM_BOT_URL = 'https://t.me/lineup24_bot';
export const TELEGRAM_BOT_USERNAME = 'lineup24_bot';

export function planLabel(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'BANK_BOOST':
      return 'Буст банка +30%';
    case 'MONTHLY':
      return 'Линия на 30 дней';
  }
}

export function subscriptionStatusLabel(
  status: SubscriptionStatusKind,
): string {
  switch (status) {
    case 'ACTIVE':
      return 'Активна';
    case 'COMPLETED':
      return 'Завершена';
    case 'REVOKED':
      return 'Отозвана';
  }
}

export function resultLabel(result: BetResult): string {
  switch (result) {
    case 'PENDING':
      return 'Открыта';
    case 'WON':
      return 'Выигрыш';
    case 'LOST':
      return 'Проигрыш';
  }
}

export const BET_RESULT_SELECT_ITEMS: Array<{
  value: BetResult;
  label: string;
}> = [
  { value: 'PENDING', label: 'Открыта' },
  { value: 'WON', label: 'Выигрыш' },
  { value: 'LOST', label: 'Проигрыш' },
];

export function audienceLabel(audience: BroadcastAudience): string {
  switch (audience) {
    case 'ACTIVE_SUBSCRIBERS':
      return 'Активные подписчики';
    case 'EMAIL_OPTED_IN':
      return 'Email';
    case 'TELEGRAM_OPTED_IN':
      return 'Telegram';
    case 'DIRECT_USER':
      return 'Личное письмо';
  }
}

export const MASS_AUDIENCE_SELECT_ITEMS: Array<{
  value: MassBroadcastAudience;
  label: string;
}> = [
  { value: 'ACTIVE_SUBSCRIBERS', label: 'Активные подписчики' },
  { value: 'EMAIL_OPTED_IN', label: 'Email' },
  { value: 'TELEGRAM_OPTED_IN', label: 'Telegram' },
];

export {
  formatDay,
  formatDateTime,
  formatShortDate,
  formatLongDate,
  formatDayKey,
  localDayKey,
  addLocalDays,
  startOfLocalMonth,
} from './datetime';