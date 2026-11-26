import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('Auth + bets smoke (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('public archive is available without auth', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/bets/archive?limit=5')
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty('hitRate');
    for (const item of res.body.items) {
      expect(['WON', 'LOST']).toContain(item.result);
      expect(item).not.toHaveProperty('comment');
    }
  });

  it('rejects register without legal accept', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: `u_${Date.now()}`,
        email: `u_${Date.now()}@example.com`,
        password: 'Password123!',
        tosAccepted: false,
        privacyAccepted: false,
      })
      .expect(400);
  });

  it('logs in seed user and reads me', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/auth/login')
      .send({
        email: 'nikita@lineup24.ru',
        password: 'Password123!',
      })
      .expect(201);

    expect(login.body.user.email).toBe('nikita@lineup24.ru');

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.email).toBe('nikita@lineup24.ru');
    expect(me.body.hasActiveSubscription).toBe(true);

    const bets = await agent.get('/api/bets?limit=5').expect(200);
    expect(Array.isArray(bets.body.items)).toBe(true);
    expect(bets.body.items.length).toBeGreaterThan(0);
    expect(bets.body.items[0].wm).toBeTruthy();
  });

  it('blocks bets for user without subscription', async () => {
    const suffix = Date.now();
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/register')
      .send({
        username: `nosub_${suffix}`,
        email: `nosub_${suffix}@example.com`,
        password: 'Password123!',
        tosAccepted: true,
        privacyAccepted: true,
      })
      .expect(201);

    await agent.get('/api/bets').expect(403);
  });
});
