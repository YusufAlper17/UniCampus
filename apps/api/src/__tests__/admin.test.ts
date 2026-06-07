import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../app.js';
import { db, schema } from '../db/index.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

async function promoteToAdmin(
  app: FastifyInstance,
  user: TestUser,
  role: 'admin' | 'super_admin' = 'admin',
): Promise<TestUser> {
  await db.update(schema.users).set({ type: role }).where(eq(schema.users.id, user.userId));
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email: user.email, password: 'supersecret123' },
  });
  return { ...user, accessToken: res.json().accessToken };
}

describe('Faz 7 — admin paneli', () => {
  let app: FastifyInstance;
  let admin: TestUser;
  let victim: TestUser;
  let universityId: string;

  beforeAll(async () => {
    app = await buildApp();
    universityId = await getSeededUniversityId();
    const adminBase = await createTestUser(app, universityId);
    admin = await promoteToAdmin(app, adminBase);
    victim = await createTestUser(app, universityId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin olmayan erişemez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/dashboard/stats',
      headers: authHeader(victim),
    });
    expect(res.statusCode).toBe(403);
  });

  it('dashboard istatistiklerini döndürür', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/dashboard/stats',
      headers: authHeader(admin),
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().users.total).toBe('number');
    expect(res.json().users.total).toBeGreaterThanOrEqual(1);
  });

  it('kullanıcıyı listeler, askıya alır ve aktive eder', async () => {
    const list = await app.inject({
      method: 'GET',
      url: `/v1/admin/users?q=${victim.username}`,
      headers: authHeader(admin),
    });
    expect((list.json().items as { id: string }[]).some((u) => u.id === victim.userId)).toBe(true);

    const suspend = await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${victim.userId}/suspend`,
      headers: authHeader(admin),
      payload: { days: 3, note: 'Spam' },
    });
    expect(suspend.statusCode).toBe(200);

    // Askılı kullanıcı giriş yapamaz.
    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: victim.email, password: 'supersecret123' },
    });
    expect(blocked.statusCode).toBe(403);

    const activate = await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${victim.userId}/activate`,
      headers: authHeader(admin),
    });
    expect(activate.statusCode).toBe(200);

    const ok = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: victim.email, password: 'supersecret123' },
    });
    expect(ok.statusCode).toBe(200);
  });

  it('moderasyon: bekleyen fırsat ilanı onaylanır', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/career/opportunities',
      headers: authHeader(victim),
      payload: { title: 'Yazılım Stajı', type: 'internship', company: 'TechCo' },
    });
    expect(create.statusCode).toBe(201);

    const queue = await app.inject({
      method: 'GET',
      url: '/v1/admin/moderation/queue',
      headers: authHeader(admin),
    });
    const opp = (queue.json().opportunities as { id: string; title: string }[]).find(
      (o) => o.title === 'Yazılım Stajı',
    );
    expect(opp).toBeTruthy();

    const approve = await app.inject({
      method: 'POST',
      url: `/v1/admin/moderation/opportunities/${opp!.id}/approve`,
      headers: authHeader(admin),
    });
    expect(approve.statusCode).toBe(200);
    expect(approve.json().status).toBe('approved');
  });

  it('denetim günlüğü admin aksiyonlarını kaydeder', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-logs',
      headers: authHeader(admin),
    });
    expect(res.statusCode).toBe(200);
    const actions = (res.json().items as { action: string }[]).map((i) => i.action);
    expect(actions).toContain('user.suspend');
    expect(actions).toContain('opportunity.approve');
  });
});
