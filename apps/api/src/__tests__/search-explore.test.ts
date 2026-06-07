import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

describe('Faz 4 — arama ve keşfet', () => {
  let app: FastifyInstance;
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    app = await buildApp();
    const universityId = await getSeededUniversityId();
    alice = await createTestUser(app, universityId);
    bob = await createTestUser(app, universityId);

    // Bob herkese açık sosyal + kariyer içerik üretir.
    await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(bob),
      payload: { contentDomain: 'social', content: 'Merhaba #kampus dünyası' },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/career/projects',
      headers: authHeader(bob),
      payload: { title: 'Keşfet projesi', techTags: ['ts'] },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/events',
      headers: authHeader(bob),
      payload: { title: 'Bahar Şenliği', startsAt: new Date(Date.now() + 86400000).toISOString() },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('kullanıcı adına göre arama yapar', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/search?q=${encodeURIComponent(bob.username)}&type=user`,
      headers: authHeader(alice),
    });
    expect(res.statusCode).toBe(200);
    const usernames = (res.json().users as { username: string }[]).map((u) => u.username);
    expect(usernames).toContain(bob.username);
  });

  it('hashtag araması yapar', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/search?q=kampus&type=hashtag',
      headers: authHeader(alice),
    });
    expect(res.statusCode).toBe(200);
    const tags = (res.json().hashtags as { tag: string }[]).map((h) => h.tag);
    expect(tags).toContain('kampus');
  });

  it('etkinlik araması yapar', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/search?q=Bahar&type=event',
      headers: authHeader(alice),
    });
    expect(res.statusCode).toBe(200);
    expect((res.json().events as unknown[]).length).toBeGreaterThan(0);
  });

  it('keşfet sosyal: önerilen hesaplar (kendisi hariç) + post döner, kariyer postu sızmaz', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/explore?domain=social',
      headers: authHeader(alice),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Önerilen hesaplar kendini içermez (self-exclusion).
    expect((body.suggestedUsers as { id: string }[]).every((u) => u.id !== alice.userId)).toBe(true);
    // Domain ayrımı: yalnızca sosyal postlar.
    const domains = (body.posts as { contentDomain: string }[]).map((p) => p.contentDomain);
    expect(domains.every((d) => d === 'social')).toBe(true);
  });

  it('keşfet kariyer: yalnızca kariyer postları, trend yok', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/explore?domain=career',
      headers: authHeader(alice),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.trending.length).toBe(0);
    const domains = (body.posts as { contentDomain: string }[]).map((p) => p.contentDomain);
    expect(domains.every((d) => d === 'career')).toBe(true);
  });

  it('keşfet kendi postunu göstermez', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(alice),
      payload: { contentDomain: 'social', content: 'Alice kendi postu' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/explore?domain=social',
      headers: authHeader(alice),
    });
    const authorIds = (res.json().posts as { authorId: string }[]).map((p) => p.authorId);
    expect(authorIds).not.toContain(alice.userId);
  });
});
