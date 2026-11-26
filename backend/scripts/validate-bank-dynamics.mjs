/**
 * Live fitness check: MONTHLY + BANK_BOOST bank transitions via settle path.
 * Requires API up + DATABASE_URL. Uses admin credentials from env or defaults.
 *
 * Usage: node scripts/validate-bank-dynamics.mjs
 */
import { PrismaClient, BetResult, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();
const STAKE = 50;
const START = 1000;
const TARGET = 1300;

function compute(start, bets) {
  let bank = start;
  for (const bet of bets) {
    if (bet.result === BetResult.WON) bank += STAKE * (Number(bet.odds) - 1);
    else if (bet.result === BetResult.LOST) bank -= STAKE;
  }
  return Math.round(bank);
}

async function wipeTestArtifacts(marker) {
  await prisma.bet.deleteMany({ where: { title: { contains: marker } } });
  await prisma.userSubscription.deleteMany({
    where: { user: { username: { in: ['bank-test-monthly', 'bank-test-boost'] } } },
  });
  await prisma.user.deleteMany({
    where: { username: { in: ['bank-test-monthly', 'bank-test-boost'] } },
  });
}

async function ensureUser(username) {
  const email = `${username}@lineup.test`;
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      username,
      passwordHash: 'x',
      role: 'USER',
    },
    update: {},
  });
}

async function grant(userId, plan, startsAt) {
  const product = await prisma.subscriptionProduct.findUnique({ where: { code: plan } });
  if (!product) throw new Error(`Missing product ${plan}`);
  const data =
    plan === SubscriptionPlan.BANK_BOOST
      ? {
          userId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          priceRubAtGrant: product.priceRub,
          startsAt,
          endsAt: null,
          bankStartRub: START,
          bankCurrentRub: START,
          bankTargetRub: TARGET,
          grantedById: null,
        }
      : {
          userId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          priceRubAtGrant: product.priceRub,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000),
          bankStartRub: START,
          bankCurrentRub: START,
          bankTargetRub: null,
          grantedById: null,
        };
  return prisma.userSubscription.create({ data });
}

async function recalc(subId, marker) {
  const sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: subId } });
  const windowEnd =
    sub.status === SubscriptionStatus.ACTIVE
      ? null
      : sub.completedAt ?? sub.endsAt ?? sub.revokedAt;
  // Marker filter isolates from other DB bets (service itself uses full feed).
  const settled = await prisma.bet.findMany({
    where: {
      title: { contains: marker },
      result: { in: [BetResult.WON, BetResult.LOST] },
      publishedAt: {
        gte: sub.startsAt,
        ...(windowEnd ? { lte: windowEnd } : {}),
      },
    },
    orderBy: { publishedAt: 'asc' },
  });
  const bankCurrentRub = Math.max(0, compute(sub.bankStartRub ?? START, settled));
  const reached =
    sub.plan === SubscriptionPlan.BANK_BOOST &&
    sub.bankTargetRub != null &&
    bankCurrentRub >= sub.bankTargetRub &&
    sub.status === SubscriptionStatus.ACTIVE;
  // Freeze at last counted bet time so window stays coherent with feed timestamps.
  const lastBetAt = settled[settled.length - 1]?.publishedAt ?? new Date();
  return prisma.userSubscription.update({
    where: { id: subId },
    data: {
      bankCurrentRub,
      ...(reached
        ? { status: SubscriptionStatus.COMPLETED, completedAt: lastBetAt }
        : {}),
    },
  });
}

async function addBet(adminId, marker, result, odds, at) {
  return prisma.bet.create({
    data: {
      title: `${marker} ${result} ${odds}`,
      forecast: 'test',
      odds,
      result,
      publishedAt: at,
      createdById: adminId,
    },
  });
}

async function main() {
  const marker = `[bank-dyn-${Date.now()}]`;
  console.log('marker', marker);

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Need an ADMIN user in DB');

  await wipeTestArtifacts('[bank-dyn-');

  const monthlyUser = await ensureUser('bank-test-monthly');
  const boostUser = await ensureUser('bank-test-boost');
  const monthlyMarker = `${marker}-M`;
  const boostMarker = `${marker}-B`;

  const monthlyStart = new Date();
  const boostStart = new Date(Date.now() + 1000);
  const monthly = await grant(
    monthlyUser.id,
    SubscriptionPlan.MONTHLY,
    monthlyStart,
  );
  const boost = await grant(boostUser.id, SubscriptionPlan.BANK_BOOST, boostStart);

  const t0 = new Date(monthlyStart.getTime() + 60_000);

  // MONTHLY path: WON 2.0 → LOST → WON 1.8 → expect 1040
  await addBet(admin.id, monthlyMarker, BetResult.WON, 2.0, new Date(t0.getTime()));
  await addBet(admin.id, monthlyMarker, BetResult.LOST, 1.9, new Date(t0.getTime() + 60_000));
  await addBet(admin.id, monthlyMarker, BetResult.WON, 1.8, new Date(t0.getTime() + 120_000));
  let m = await recalc(monthly.id, monthlyMarker);
  if (m.bankCurrentRub !== 1040 || m.status !== SubscriptionStatus.ACTIVE) {
    throw new Error(`MONTHLY bank unexpected: ${m.bankCurrentRub} ${m.status}`);
  }
  console.log('OK MONTHLY live bank →', m.bankCurrentRub);

  // Complete MONTHLY artificially and freeze window
  const monthlyEnd = new Date(t0.getTime() + 180_000);
  m = await prisma.userSubscription.update({
    where: { id: monthly.id },
    data: {
      status: SubscriptionStatus.COMPLETED,
      completedAt: monthlyEnd,
      endsAt: monthlyEnd,
    },
  });
  await addBet(admin.id, monthlyMarker, BetResult.WON, 3.0, new Date(t0.getTime() + 240_000));
  m = await recalc(monthly.id, monthlyMarker);
  if (m.bankCurrentRub !== 1040) {
    throw new Error(`MONTHLY archive freeze failed: ${m.bankCurrentRub}`);
  }
  console.log('OK MONTHLY archive freeze →', m.bankCurrentRub, m.status);

  // BOOST: six wins @2.0 from 1000 → 1300 COMPLETED
  for (let i = 0; i < 6; i++) {
    await addBet(
      admin.id,
      boostMarker,
      BetResult.WON,
      2.0,
      new Date(boostStart.getTime() + (i + 1) * 60_000),
    );
  }
  let b = await recalc(boost.id, boostMarker);
  if (b.bankCurrentRub !== TARGET || b.status !== SubscriptionStatus.COMPLETED) {
    throw new Error(`BOOST complete failed: ${b.bankCurrentRub} ${b.status}`);
  }
  console.log('OK BANK_BOOST complete →', b.bankCurrentRub, b.status);

  // Post-complete bet must not change frozen bank
  await addBet(
    admin.id,
    boostMarker,
    BetResult.WON,
    2.0,
    new Date(boostStart.getTime() + 10 * 60_000),
  );
  b = await recalc(boost.id, boostMarker);
  if (b.bankCurrentRub !== TARGET) {
    throw new Error(`BOOST freeze failed: ${b.bankCurrentRub}`);
  }
  console.log('OK BANK_BOOST archive freeze →', b.bankCurrentRub);

  console.log('\nPASS bank dynamics fitness');
  await wipeTestArtifacts(marker);
}

main()
  .catch((err) => {
    console.error('FAIL', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
