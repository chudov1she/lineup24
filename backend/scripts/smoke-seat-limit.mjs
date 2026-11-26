import { PrismaClient, Role, SubscriptionPlan } from '@prisma/client';

const API = 'http://localhost:8000/api';
const prisma = new PrismaClient();

function cookies(res) {
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
}

const s = Date.now();

const regAdmin = await fetch(`${API}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: `adm${s}`,
    email: `adm${s}@ex.com`,
    password: 'password123',
  }),
});
const admin = await regAdmin.json();
await prisma.user.update({
  where: { id: admin.user.id },
  data: { role: Role.ADMIN },
});

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `adm${s}@ex.com`, password: 'password123' }),
});
const adminSession = cookies(login);

const regUser = await fetch(`${API}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: `u${s}`,
    email: `u${s}@ex.com`,
    password: 'password123',
  }),
});
const user = await regUser.json();

const grant = await fetch(`${API}/subscriptions/grant`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: adminSession,
  },
  body: JSON.stringify({
    userId: user.user.id,
    plan: SubscriptionPlan.MONTHLY,
  }),
});
const body = await grant.json();
console.log(JSON.stringify({ status: grant.status, body }, null, 2));
await prisma.$disconnect();
if (grant.status !== 409) process.exit(1);
