# frontend

Next.js App Router + shadcn/ui. Independent package — own `node_modules`, own `.env.local`, own `Dockerfile`.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

- App: http://localhost:3000
- Dashboard template: http://localhost:3000/dashboard

API calls use `credentials: 'include'` against `NEXT_PUBLIC_API_URL`.
