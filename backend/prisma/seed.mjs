import {
  BetResult,
  PrismaClient,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const products = [
  {
    code: SubscriptionPlan.BANK_BOOST,
    title: 'Буст банка +30%',
    priceRub: 1000,
    description:
      'Основной тариф. Старт банка 1000, цель 1300 (+30%). Актуальная линия в кабинете, пока банк ниже цели.',
  },
  {
    code: SubscriptionPlan.MONTHLY,
    title: 'Месячный доступ',
    priceRub: 7777,
    description:
      '30 календарных дней доступа к актуальной линии без цели по банку.',
  },
];

const sampleBets = [
  ['ЦСКА — Спартак', 'Тотал больше 2.5', '1.85', 'PENDING', null],
  ['Зенит — Краснодар', 'Победа Зенита', '1.72', 'WON', '2:1'],
  ['Локомотив — Динамо', 'Обе забьют', '1.90', 'LOST', '1:0'],
  ['Реал — Барселона', 'ТБ 2.5', '1.78', 'PENDING', null],
  ['Арсенал — Челси', 'Хозяева не проиграют', '1.55', 'WON', '2:2'],
  ['Бавария — Дортмунд', 'Гости забьют', '1.65', 'PENDING', null],
  ['Интер — Милан', 'Тотал меньше 3.5', '1.70', 'WON', '1:1'],
  ['ПСЖ — Марсель', 'Победа ПСЖ', '1.45', 'LOST', '0:1'],
  ['Ливерпуль — Ман Сити', 'Обе забьют', '1.62', 'PENDING', null],
  ['Ювентус — Наполи', 'Фора 0 хозяева', '1.88', 'WON', '2:0'],
];

async function upsertUser({
  email,
  username,
  role,
  passwordHash,
  tosVersion,
  privacyVersion,
  now,
}) {
  const byEmail = await prisma.user.findUnique({ where: { email } });
  const byUsername = await prisma.user.findUnique({ where: { username } });
  const existing = byEmail ?? byUsername;

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        username,
        passwordHash,
        role,
        emailVerifiedAt: now,
        tosAcceptedAt: existing.tosAcceptedAt ?? now,
        tosVersion: existing.tosVersion ?? tosVersion,
        privacyAcceptedAt: existing.privacyAcceptedAt ?? now,
        privacyVersion: existing.privacyVersion ?? privacyVersion,
        lastActivityAt: now,
      },
    });
  }

  return prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role,
      emailVerifiedAt: now,
      tosAcceptedAt: now,
      tosVersion,
      privacyAcceptedAt: now,
      privacyVersion,
      emailSignals: true,
      telegramSignals: false,
      lastActivityAt: now,
    },
  });
}

async function main() {
  for (const product of products) {
    await prisma.subscriptionProduct.upsert({
      where: { code: product.code },
      create: product,
      update: {
        title: product.title,
        priceRub: product.priceRub,
        description: product.description,
      },
    });
  }

  const passwordHash = await bcrypt.hash('Password123!', 12);
  const tosVersion = process.env.TOS_VERSION ?? '2026-11-22';
  const privacyVersion = process.env.PRIVACY_VERSION ?? '2026-11-22';
  const now = new Date();

  const admin = await upsertUser({
    email: 'admin@lineup24.ru',
    username: 'admin',
    role: Role.ADMIN,
    passwordHash,
    tosVersion,
    privacyVersion,
    now,
  });

  const user = await upsertUser({
    email: 'nikita@lineup24.ru',
    username: 'nikita',
    role: Role.USER,
    passwordHash,
    tosVersion,
    privacyVersion,
    now,
  });

  for (const [documentKey, version] of [
    ['tos', tosVersion],
    ['privacy', privacyVersion],
  ]) {
    for (const u of [admin, user]) {
      const existing = await prisma.legalAcceptance.findFirst({
        where: { userId: u.id, documentKey, version },
      });
      if (!existing) {
        await prisma.legalAcceptance.create({
          data: {
            userId: u.id,
            documentKey,
            version,
            ip: '127.0.0.1',
            userAgent: 'seed',
          },
        });
      }
    }
  }

  const activeBoost = await prisma.userSubscription.findFirst({
    where: {
      userId: user.id,
      plan: SubscriptionPlan.BANK_BOOST,
      status: SubscriptionStatus.ACTIVE,
    },
  });
  if (!activeBoost) {
    await prisma.userSubscription.create({
      data: {
        userId: user.id,
        plan: SubscriptionPlan.BANK_BOOST,
        status: SubscriptionStatus.ACTIVE,
        priceRubAtGrant: 1000,
        startsAt: now,
        bankStartRub: 1000,
        bankCurrentRub: 1184,
        bankTargetRub: 1300,
        grantedById: admin.id,
      },
    });
  }

  const betCount = await prisma.bet.count();
  if (betCount < 20) {
    const rows = [];
    for (let i = 0; i < 40; i += 1) {
      const sample = sampleBets[i % sampleBets.length];
      const [title, forecast, odds, result, score] = sample;
      const publishedAt = new Date(Date.now() - i * 36e5 * 6);
      rows.push({
        title: `${title} #${i + 1}`,
        forecast,
        odds,
        result: BetResult[result],
        score,
        comment:
          result === 'PENDING'
            ? 'Рабочий сигнал. Следим за линией и составами.'
            : 'Разбор по факту результата для архива.',
        publishedAt,
        createdById: admin.id,
      });
    }
    await prisma.bet.createMany({ data: rows });
  }

  console.log('Seed OK:', {
    admin: admin.email,
    user: user.email,
    password: 'Password123!',
    bets: await prisma.bet.count(),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
