# lineup24 ops runbook

## Production (lineup24.ru)

Server: `/opt/lineup24` on the VPS. Stack: Docker Compose + **Caddy** (HTTPS via Let’s Encrypt).

```bash
ssh root@YOUR_HOST
cd /opt/lineup24
git pull
docker compose up -d --build
docker compose ps
```

- Site: https://lineup24.ru (Caddy → frontend:3000 → `/api` rewrite → backend)
- Secrets: `/opt/lineup24/.env` + `/opt/lineup24/backend/.env` (chmod 600, not in git)
- DB restore example: `docker compose cp dump.dump db:/tmp/d.dump && docker compose exec -T db pg_restore -U lineup -d lineup --clean --if-exists --no-owner --no-acl /tmp/d.dump`

## Local stack (Docker — recommended)

Full stack (Postgres + Redis + Nest + Next):

```bash
# from repo root
docker compose up -d --build
# optional seed
docker compose exec backend node prisma/seed.mjs
```

- Frontend: http://localhost:3000  
- API (direct): http://localhost:8000/docs  
- Same-origin API via Next: http://localhost:3000/api → Nest  
- Logs: `docker compose logs -f`  
- Stop: `docker compose down`

Secrets: `backend/.env` (compose overrides `DATABASE_URL` / `REDIS_URL` for the Docker network).  
First seed: `RUN_SEED=true docker compose up -d --build` or the `exec` command above.

### Public tunnel (ngrok)

Frontend proxies `/api` to Nest. One tunnel to **port 3000** is enough:

```bash
# from repo root (stack must be up)
npm run tunnel
# or: ngrok http 3000  → then set FRONTEND_URL + COOKIE_SECURE=true and recreate backend
```

- Site: `https://<ngrok>/`  
- API / Platega webhook: `https://<ngrok>/api/...`  
- Swagger: `https://<ngrok>/docs`  
- Open the **https** URL (not localhost) so Secure cookies work.

### Host apps (optional)

1. Infra only: `docker compose up -d db redis`
2. Backend: `cd backend && npx prisma migrate deploy && npm run start:dev`
3. Frontend: `cd frontend && npm run dev`

Seed accounts (password `Password123!`):
- `admin@lineup24.ru` (ADMIN)
- `nikita@lineup24.ru` (USER with BANK_BOOST)

## Required env (never commit values)

See `backend/.env.example`. Critical:

- `DATABASE_URL`, `JWT_*`
- `TOS_VERSION`, `PRIVACY_VERSION`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME=lineup24_bot`, `TELEGRAM_WEBHOOK_SECRET`
- `PLATEGA_MERCHANT_ID`, `PLATEGA_SECRET` (after bank approval)
- Web Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (default `mailto:support@lineup24.ru`)

Generate VAPID keys (once per environment):

```bash
cd backend && npx web-push generate-vapid-keys
```

Put the pair into `.env`. Frontend gets the public key via `GET /api/notifications/push/vapid-public-key`. HTTPS (or localhost) required for browser push.

If secrets were pasted in chat, **rotate** BotFather token and Platega secret before production.

## Webhooks

### Platega (оплата → grant)

1. В [platega.io](https://platega.io/) ЛК → **Настройки → Callback URLs**
2. URL: `https://YOUR_HOST/api/payments/platega/webhook`
3. Только HTTPS, публичный домен, доверенный SSL (не localhost / self-signed)
4. Auth: Platega шлёт заголовки `X-MerchantId` + `X-Secret` — должны совпадать с `PLATEGA_MERCHANT_ID` / `PLATEGA_SECRET`
5. Статусы: `CONFIRMED` → grant подписки; `CANCELED` → заказ CANCELLED; `CHARGEBACKED` → revoke ACTIVE подписки

Локально (туннель через Docker frontend):

```bash
docker compose up -d --build
npm run tunnel
# Platega Callback URL: https://<ngrok-host>/api/payments/platega/webhook
```

Checkout: `POST /api/payments/checkout` `{ "plan": "MONTHLY" | "BANK_BOOST" }` → redirect на `paymentUrl`.

Тестовый аккаунт Platega от менеджера **нельзя** подключать к проекту — ждать реальные merchant credentials после одобрения банка.

### Telegram

Local (default): Nest starts **long polling** with the API process (`TELEGRAM_MODE=polling`).  
No public URL / ngrok needed for `/start` → bind token.

1. Put `TELEGRAM_BOT_TOKEN` in `backend/.env`
2. `npm run start:dev` — log should show `Telegram bot polling started`
3. Open `@lineup24_bot` → `/start` → paste token in Настройки

Production webhook:

```bash
# .env
TELEGRAM_MODE=webhook
TELEGRAM_WEBHOOK_URL=https://YOUR_HOST/api/notifications/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=your-secret

# Nest calls setWebhook on boot. Manual alternative:
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_HOST/api/notifications/telegram/webhook?secret=$TELEGRAM_WEBHOOK_SECRET" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Endpoint: `POST /api/notifications/telegram/webhook?secret=$TELEGRAM_WEBHOOK_SECRET`  
(or header `X-Telegram-Bot-Api-Secret-Token`)

## Ops checks

- Blocked users cannot login / JWT validates `blockedAt` + session revoke
- Signals require active subscription (`SubscriptionActiveGuard`)
- Throttler global + tighter auth limits
- AuditLog for register/login/password/email/grants

## Smoke checklist

```bash
cd backend && npm test && npm run test:e2e
cd frontend && npx tsc --noEmit
```

Manual:
1. Register with ToS → login → `/dashboard`
2. Without sub: signals locked (403)
3. Admin grant or Platega checkout webhook → signals visible
4. Settings: bind TG token from bot `/start`
5. Admin: users block/overlaps, manage-bets create, broadcast, metrics
6. Bump `TOS_VERSION` → dashboard shows re-accept gate

## Customer handoff

Put production `PLATEGA_MERCHANT_ID` / `PLATEGA_SECRET`; set Callback URL to prod host; swap legal copy; point TG webhook to prod URL.
