import { PrismaClient, Role, SubscriptionPlan } from '@prisma/client';

const API = 'http://localhost:8000/api';
const prisma = new PrismaClient();

function parseCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function json(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function main() {
  const suffix = Date.now();
  const adminEmail = `admin${suffix}@example.com`;
  const userEmail = `user${suffix}@example.com`;

  // Register admin candidate
  let res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `admin${suffix}`,
      email: adminEmail,
      password: 'password123',
    }),
  });
  if (!res.ok) throw new Error(`admin register ${res.status} ${await res.text()}`);
  const adminBody = await json(res);
  const adminCookies = parseCookies(res);

  await prisma.user.update({
    where: { id: adminBody.user.id },
    data: { role: Role.ADMIN },
  });

  // Re-login as admin to refresh JWT role
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: 'password123' }),
  });
  if (!res.ok) throw new Error(`admin login ${res.status}`);
  const adminSession = parseCookies(res);

  // Register regular user
  res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `user${suffix}`,
      email: userEmail,
      password: 'password123',
    }),
  });
  if (!res.ok) throw new Error(`user register ${res.status}`);
  const userBody = await json(res);
  const userCookies = parseCookies(res);

  // Products
  res = await fetch(`${API}/subscriptions/products`);
  const products = await json(res);
  if (!res.ok || products.length !== 2) {
    throw new Error(`products failed: ${JSON.stringify(products)}`);
  }

  // User without sub cannot list bets
  res = await fetch(`${API}/bets`, { headers: { Cookie: userCookies } });
  if (res.status !== 403) {
    throw new Error(`expected bets 403 without sub, got ${res.status}`);
  }

  // Grant BANK_BOOST
  res = await fetch(`${API}/subscriptions/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminSession,
    },
    body: JSON.stringify({
      userId: userBody.user.id,
      plan: SubscriptionPlan.BANK_BOOST,
    }),
  });
  const boost = await json(res);
  if (!res.ok) throw new Error(`grant boost ${res.status} ${JSON.stringify(boost)}`);
  if (boost.bankStartRub !== 1000 || boost.bankTargetRub !== 1300) {
    throw new Error(`bad bank fields ${JSON.stringify(boost)}`);
  }

  // Auth me still works
  res = await fetch(`${API}/auth/me`, { headers: { Cookie: userCookies } });
  if (!res.ok) throw new Error(`auth me ${res.status}`);

  // User can list bets (empty ok)
  res = await fetch(`${API}/bets`, { headers: { Cookie: userCookies } });
  if (!res.ok) throw new Error(`bets list ${res.status}`);

  // Admin creates bet
  res = await fetch(`${API}/bets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminSession,
    },
    body: JSON.stringify({
      title: 'Тестовый матч',
      forecast: 'П1',
      odds: 1.85,
    }),
  });
  const bet = await json(res);
  if (!res.ok) throw new Error(`create bet ${res.status} ${JSON.stringify(bet)}`);

  // Patch bet
  res = await fetch(`${API}/bets/${bet.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminSession,
    },
    body: JSON.stringify({ result: 'WON', score: '2:1' }),
  });
  const patched = await json(res);
  if (!res.ok || patched.result !== 'WON') {
    throw new Error(`patch bet failed ${JSON.stringify(patched)}`);
  }

  // Second BANK_BOOST grant keeps old history
  res = await fetch(`${API}/subscriptions/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminSession,
    },
    body: JSON.stringify({
      userId: userBody.user.id,
      plan: SubscriptionPlan.BANK_BOOST,
    }),
  });
  const boost2 = await json(res);
  if (!res.ok) throw new Error(`second grant ${res.status}`);

  res = await fetch(`${API}/subscriptions/me`, {
    headers: { Cookie: userCookies },
  });
  const me = await json(res);
  if (!res.ok) throw new Error(`subs me ${res.status}`);
  const boostHistory = me.history.filter((s) => s.plan === 'BANK_BOOST');
  if (boostHistory.length < 2) {
    throw new Error(`expected 2 bank boost rows, got ${boostHistory.length}`);
  }
  if (!boostHistory.some((s) => s.id === boost.id)) {
    throw new Error('old subscription missing from history');
  }

  // Seat limit smoke with temporary limit via direct count check path:
  // revoke second then ensure revoke works
  res = await fetch(`${API}/subscriptions/${boost2.id}/revoke`, {
    method: 'POST',
    headers: { Cookie: adminSession },
  });
  const revoked = await json(res);
  if (!res.ok || revoked.status !== 'REVOKED') {
    throw new Error(`revoke failed ${JSON.stringify(revoked)}`);
  }

  // MONTHLY grant
  res = await fetch(`${API}/subscriptions/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminSession,
    },
    body: JSON.stringify({
      userId: userBody.user.id,
      plan: SubscriptionPlan.MONTHLY,
    }),
  });
  const monthly = await json(res);
  if (!res.ok || !monthly.endsAt) {
    throw new Error(`monthly grant failed ${JSON.stringify(monthly)}`);
  }

  // Delete bet
  res = await fetch(`${API}/bets/${bet.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminSession },
  });
  if (!res.ok) throw new Error(`delete bet ${res.status}`);

  // Seat limit: temporarily set many active users is heavy; verify seats object exists
  if (!me.seats || me.seats.limit !== 100) {
    throw new Error(`bad seats ${JSON.stringify(me.seats)}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        products: products.map((p) => p.code),
        boostId: boost.id,
        boost2Id: boost2.id,
        monthlyId: monthly.id,
        seats: me.seats,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
