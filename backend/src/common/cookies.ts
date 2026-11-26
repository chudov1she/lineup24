import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const VISITOR_COOKIE = 'visitor_key';

const VISITOR_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function cookieSecure(isProd: boolean): boolean {
  const raw = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return isProd;
}

const baseCookieOptions = (isProd: boolean): CookieOptions => ({
  httpOnly: true,
  // HTTPS (ngrok) needs Secure; local http://localhost needs COOKIE_SECURE=false
  secure: cookieSecure(isProd),
  sameSite: 'lax',
  path: '/',
});

export function readVisitorKey(
  cookies: Record<string, string> | undefined,
): string | undefined {
  const value = cookies?.[VISITOR_COOKIE];
  return value && value.length >= 8 && value.length <= 128 ? value : undefined;
}

export function setVisitorCookie(
  res: Response,
  visitorKey: string,
  isProd: boolean,
) {
  res.cookie(VISITOR_COOKIE, visitorKey, {
    ...baseCookieOptions(isProd),
    maxAge: VISITOR_MAX_AGE_MS,
  });
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  maxAge: { accessMs: number; refreshMs: number },
  isProd: boolean,
) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(isProd),
    maxAge: maxAge.accessMs,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(isProd),
    maxAge: maxAge.refreshMs,
  });
}

export function clearAuthCookies(res: Response, isProd: boolean) {
  const opts = baseCookieOptions(isProd);
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}
