import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

describe('Faz 2 — post, beğeni, yorum, trending', () => {
  let app: FastifyInstance;
  let user: TestUser;
  let postId: string;

  beforeAll(async () => {
    app = await buildApp();
    const universityId = await getSeededUniversityId();
    user = await createTestUser(app, universityId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('post oluşturur (hashtag ile)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(user),
      payload: { contentDomain: 'social', content: 'Merhaba #yazilim #kampus' },
    });
    expect(res.statusCode).toBe(201);
    postId = res.json().post.id;
    expect(postId).toBeTruthy();
  });

  it('boş post reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(user),
      payload: { contentDomain: 'social', mediaUrls: [] },
    });
    expect(res.statusCode).toBe(422);
  });

  it('beğenir ve beğeni sayısı artar', async () => {
    const like = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/like`,
      headers: authHeader(user),
    });
    expect(like.statusCode).toBe(200);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/posts/${postId}`,
      headers: authHeader(user),
    });
    expect(detail.json().post.likeCount).toBe(1);
    expect(detail.json().post.likedByMe).toBe(true);
  });

  it('yorum ekler', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeader(user),
      payload: { content: 'Harika!' },
    });
    expect(res.statusCode).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeader(user),
    });
    expect(list.json().items.length).toBe(1);
  });

  it('trending hashtag döner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/trending',
      headers: authHeader(user),
    });
    expect(res.statusCode).toBe(200);
    const tags = (res.json().items as { tag: string }[]).map((t) => t.tag);
    expect(tags).toContain('yazilim');
  });

  it('feed kendi postunu içerir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=social',
      headers: authHeader(user),
    });
    const ids = (res.json().items as { type: string; post?: { id: string } }[])
      .filter((i) => i.type === 'post')
      .map((i) => i.post!.id);
    expect(ids).toContain(postId);
  });
});
