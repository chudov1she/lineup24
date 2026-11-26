# lineup24

Независимые сервисы. Общее при деплое — только `docker-compose.yml` и Dockerfile’ы пакетов.

| Package | Stack | Port |
|---------|--------|------|
| [`backend/`](backend) | NestJS + Prisma + PostgreSQL | `8000` (`/api`, docs `/docs`) |
| [`frontend/`](frontend) | Next.js + shadcn/ui | `3000` |

У каждого пакета свой `package.json`, свой `node_modules`, свой `.env`, свой `Dockerfile`.

## Local (рекомендуется сейчас)

В Docker — **Postgres + Redis**. Backend и frontend запускаются с хоста.

```bash
docker compose up -d
```

- Postgres: `localhost:5432` (`lineup` / `lineup` / db `lineup`)
- Redis: `localhost:6379`

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

- API: http://localhost:8000/api
- Docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

- App: http://localhost:3000/dashboard

## Deploy (позже)

Dockerfile’ы уже есть. Полный стек в Docker:

```bash
docker compose --profile apps up -d --build
```


## Auth

- JWT access + refresh в **httpOnly cookies**
- Email verification в **dev-mode**: код в лог и в ответе API (SMTP позже)
