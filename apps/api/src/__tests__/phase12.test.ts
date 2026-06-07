import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId } from './helpers.js';

describe('Faz 12 — Reels + readiness', () => {
  let app: FastifyInstance;
  let universityId: string;

  beforeAll(async () => {
    app = await buildApp();
    universityId = await getSeededUniversityId();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reel oluşturulur ve reels akışında listelenir', async () => {
    const user = await createTestUser(app, universityId);
    const created = await app.inject({
      method: 'POST',
      url: '/v1/reels',
      headers: authHeader(user),
      payload: { mediaUrl: 'https://cdn.test/reel.mp4', caption: 'ilk reel' },
    });
    expect(created.statusCode).toBe(201);
    const reelId = created.json().reel.id as string;

    const list = await app.inject({ method: 'GET', url: '/v1/reels', headers: authHeader(user) });
    expect(list.statusCode).toBe(200);
    expect(list.json().items.some((r: any) => r.id === reelId)).toBe(true);
  });

  it('reel normal sosyal akışta görünmez', async () => {
    const user = await createTestUser(app, universityId);
    const post = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(user),
      payload: { contentDomain: 'social', content: 'normal gönderi' },
    });
    const postId = post.json().post.id as string;
    const reel = await app.inject({
      method: 'POST',
      url: '/v1/reels',
      headers: authHeader(user),
      payload: { mediaUrl: 'https://cdn.test/reel2.mp4' },
    });
    const reelId = reel.json().reel.id as string;

    const feed = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=social',
      headers: authHeader(user),
    });
    const ids = feed.json().items.filter((i: any) => i.type === 'post').map((i: any) => i.post.id);
    expect(ids).toContain(postId);
    expect(ids).not.toContain(reelId);
  });

  it('readiness probe DB ve Redis kontrol eder', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json().ready).toBe(true);
    expect(res.json().checks.db).toBe(true);
    expect(res.json().checks.redis).toBe(true);
  });
});
