import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId } from './helpers.js';

describe('reports', () => {
  let app: FastifyInstance;
  let universityId: string;

  beforeAll(async () => {
    app = await buildApp();
    universityId = await getSeededUniversityId();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a post report', async () => {
    const user = await createTestUser(app, universityId);
    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(user),
      payload: { contentDomain: 'social', content: 'Şikayet testi' },
    });
    expect(postRes.statusCode).toBe(201);
    const postId = postRes.json().post.id as string;

    const reportRes = await app.inject({
      method: 'POST',
      url: '/v1/reports',
      headers: authHeader(user),
      payload: {
        targetType: 'post',
        targetId: postId,
        reason: 'spam',
        details: 'Test şikayeti',
      },
    });
    expect(reportRes.statusCode).toBe(201);
    expect(reportRes.json().report.status).toBe('open');
  });

  it('rejects duplicate report on same target', async () => {
    const user = await createTestUser(app, universityId);
    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeader(user),
      payload: { contentDomain: 'social', content: 'Tekrar şikayet' },
    });
    const postId = postRes.json().post.id as string;

    const first = await app.inject({
      method: 'POST',
      url: '/v1/reports',
      headers: authHeader(user),
      payload: { targetType: 'post', targetId: postId, reason: 'spam' },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/reports',
      headers: authHeader(user),
      payload: { targetType: 'post', targetId: postId, reason: 'spam' },
    });
    expect(second.statusCode).toBe(409);
  });
});
