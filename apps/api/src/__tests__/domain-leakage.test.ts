import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

/**
 * KRİTİK INVARIANT — "iki evren, sıfır sızıntı".
 * Sosyal feed'de ASLA career post görünmemeli ve tersi.
 * Bu test CI gate'idir; başarısızlık merge'i engeller.
 */
describe('Domain leakage — sosyal/kariyer kesin ayrım', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await buildApp();
    const universityId = await getSeededUniversityId();
    user = await createTestUser(app, universityId);

    await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(user),
      payload: { contentDomain: 'social', content: 'Sosyal gönderi #kampus' },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(user),
      payload: { contentDomain: 'career', type: 'project', content: 'Kariyer projesi' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('sosyal feed yalnızca sosyal post içerir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=social',
      headers: authHeader(user),
    });
    expect(res.statusCode).toBe(200);
    const items = res.json().items as { type: string; post?: { contentDomain: string } }[];
    const posts = items.filter((i) => i.type === 'post');
    expect(posts.length).toBeGreaterThan(0);
    for (const item of posts) {
      expect(item.post!.contentDomain).toBe('social');
    }
  });

  it('kariyer feed yalnızca kariyer post içerir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=career',
      headers: authHeader(user),
    });
    expect(res.statusCode).toBe(200);
    const items = res.json().items as { type: string; post?: { contentDomain: string } }[];
    const posts = items.filter((i) => i.type === 'post');
    expect(posts.length).toBeGreaterThan(0);
    for (const item of posts) {
      expect(item.post!.contentDomain).toBe('career');
    }
  });

  it('kariyer feed reklam içermez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=career',
      headers: authHeader(user),
    });
    const items = res.json().items as { type: string }[];
    expect(items.every((i) => i.type !== 'ad')).toBe(true);
  });

  it('geçersiz domain reddedilir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=mixed',
      headers: authHeader(user),
    });
    expect(res.statusCode).toBe(400);
  });
});
