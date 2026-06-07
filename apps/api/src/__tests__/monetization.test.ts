import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildApp } from '../app.js';
import { db, schema } from '../db/index.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

async function promoteToAdmin(app: FastifyInstance, user: TestUser): Promise<TestUser> {
  await db.update(schema.users).set({ type: 'admin' }).where(eq(schema.users.id, user.userId));
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email: user.email, password: 'supersecret123' },
  });
  return { ...user, accessToken: res.json().accessToken };
}

describe('Faz 8 — monetizasyon', () => {
  let app: FastifyInstance;
  let admin: TestUser;
  let user: TestUser;
  let universityId: string;
  let sponsorId: string;
  let dealId: string;
  let adId: string;

  beforeAll(async () => {
    app = await buildApp();
    universityId = await getSeededUniversityId();
    const adminBase = await createTestUser(app, universityId);
    admin = await promoteToAdmin(app, adminBase);
    user = await createTestUser(app, universityId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('sponsor oluşturur', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/sponsors',
      headers: authHeader(admin),
      payload: { brandName: 'Test Marka' },
    });
    expect(res.statusCode).toBe(201);
    sponsorId = res.json().sponsor.id;
  });

  it('deal oluşturur, yayınlar ve mobilde görünür', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/admin/deals',
      headers: authHeader(admin),
      payload: {
        sponsorId,
        title: '%20 Öğrenci İndirimi',
        discountValue: '%20',
        category: 'Teknoloji',
        targetUniversities: [universityId],
      },
    });
    expect(create.statusCode).toBe(201);
    dealId = create.json().deal.id;

    const pub = await app.inject({
      method: 'PATCH',
      url: `/v1/admin/deals/${dealId}/publish`,
      headers: authHeader(admin),
    });
    expect(pub.statusCode).toBe(200);

    const list = await app.inject({
      method: 'GET',
      url: '/v1/deals',
      headers: authHeader(user),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items.some((d: { id: string }) => d.id === dealId)).toBe(true);
  });

  it('deal kodu reveal edilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/deals/${dealId}/reveal`,
      headers: authHeader(user),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().discountCode).toBeTruthy();
  });

  it('reklam kampanyası sosyal feed e enjekte edilir, kariyer feed e sızmaz', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/admin/ads',
      headers: authHeader(admin),
      payload: {
        sponsorId,
        title: 'Sponsorlu Post',
        mediaUrl: 'https://picsum.photos/800/400',
        ctaText: 'Keşfet',
        targetUrl: 'https://example.com',
        targeting: { universities: [universityId] },
      },
    });
    expect(create.statusCode).toBe(201);
    adId = create.json().campaign.id;

    await app.inject({
      method: 'PATCH',
      url: `/v1/admin/ads/${adId}/publish`,
      headers: authHeader(admin),
    });

    // Feed'de en az bir post olsun ki reklam slotu oluşsun.
    await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(user),
      payload: { contentDomain: 'social', type: 'post', content: 'Test post for ads' },
    });

    const social = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=social&limit=20',
      headers: authHeader(user),
    });
    const socialTypes = (social.json().items as { type: string }[]).map((i) => i.type);
    expect(socialTypes).toContain('ad');

    const career = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=career&limit=20',
      headers: authHeader(user),
    });
    const careerTypes = (career.json().items as { type: string }[]).map((i) => i.type);
    expect(careerTypes).not.toContain('ad');
  });

  it('analitik overview döner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/analytics/overview',
      headers: authHeader(admin),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().deals.redemptions).toBeGreaterThanOrEqual(1);
  });
});
