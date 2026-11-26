import https from 'node:https';
import { SocksProxyAgent } from 'socks-proxy-agent';

let cached: { key: string; agent: SocksProxyAgent } | null = null;

function resolveAgent(): SocksProxyAgent | undefined {
  const raw = process.env.TELEGRAM_SOCKS_PROXY?.trim();
  if (!raw) return undefined;
  if (cached?.key === raw) return cached.agent;
  const agent = new SocksProxyAgent(raw);
  cached = { key: raw, agent };
  return agent;
}

function headersToRecord(
  headers?: HeadersInit,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

/**
 * HTTPS request to Telegram API, optionally through TELEGRAM_SOCKS_PROXY
 * (`socks5://user:pass@host:port`).
 */
export function telegramFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === 'string' ? new URL(input) : new URL(input.href);
  const agent = resolveAgent();
  const method = (init?.method ?? 'GET').toUpperCase();
  const body =
    typeof init?.body === 'string'
      ? init.body
      : init?.body != null
        ? String(init.body)
        : undefined;

  return new Promise<Response>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        headers: headersToRecord(init?.headers),
        agent,
        signal: init?.signal ?? undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const headerInit: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (value == null) continue;
            headerInit[key] = Array.isArray(value) ? value.join(', ') : value;
          }
          resolve(
            new Response(buf, {
              status: res.statusCode ?? 502,
              statusText: res.statusMessage,
              headers: headerInit,
            }),
          );
        });
      },
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export function telegramProxyEnabled(): boolean {
  return Boolean(process.env.TELEGRAM_SOCKS_PROXY?.trim());
}
