# backend (lineup24)

NestJS API. Independent package — own `node_modules`, own `.env`, own `Dockerfile`.

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Requires Postgres (+ Redis optional) via `docker compose up -d` from repo root.

- API prefix: `/api`
- Swagger: `/docs` (no `/api` prefix)
- Port: `8000`

## Auth

Cookie JWT (`access_token`, `refresh_token`, httpOnly).

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | sets cookies; returns `verificationCode` in dev |
| POST | `/api/auth/login` | sets cookies |
| POST | `/api/auth/refresh` | rotates refresh |
| POST | `/api/auth/logout` | clears cookies |
| GET | `/api/auth/me` | current user |
| POST | `/api/auth/verify-email` | body `{ code }` |
| POST | `/api/auth/resend-verification` | returns code in dev |

## Subscriptions

Plans: `BANK_BOOST` (1000₽, bank 1000→1300) and `MONTHLY` (7777₽, 30 days).  
Max active subscriber seats: `SUBSCRIPTION_SEAT_LIMIT` (default 100). Each grant creates a **new** history row.

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/subscriptions/products` | public |
| GET | `/api/subscriptions/me` | JWT |
| POST | `/api/subscriptions/grant` | ADMIN `{ userId, plan }` |
| POST | `/api/subscriptions/:id/revoke` | ADMIN |

## Bets (signals)

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/bets` | JWT + active subscription (ADMIN bypass) |
| GET | `/api/bets/:id` | JWT + active subscription |
| POST | `/api/bets` | ADMIN |
| PATCH | `/api/bets/:id` | ADMIN |
| DELETE | `/api/bets/:id` | ADMIN |
