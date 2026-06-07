import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

describe('Faz 3 — etkinlik, anket, kariyer', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await buildApp();
    const universityId = await getSeededUniversityId();
    user = await createTestUser(app, universityId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('etkinlik oluşturur ve katılım sayısı artar', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/events',
      headers: authHeader(user),
      payload: {
        title: 'Hackathon 2026',
        description: '48 saat kodlama',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        capacity: 2,
        participationType: 'open',
      },
    });
    expect(create.statusCode).toBe(201);
    const eventId = create.json().event.id;

    const join = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/join`,
      headers: authHeader(user),
    });
    expect(join.statusCode).toBe(200);
    expect(join.json().status).toBe('joined');

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}`,
      headers: authHeader(user),
    });
    expect(detail.json().event.participantCount).toBe(1);
    expect(detail.json().event.myStatus).toBe('joined');
  });

  it('ücretli etkinlik fiyatsız reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/events',
      headers: authHeader(user),
      payload: {
        title: 'Ücretli',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        isPaid: true,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('anket oluşturur, oy verir, çift oy engellenir', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/polls',
      headers: authHeader(user),
      payload: {
        question: 'En iyi dil?',
        options: ['TS', 'Python', 'Go'],
        durationHours: 24,
      },
    });
    expect(create.statusCode).toBe(201);
    const poll = create.json().poll;
    const optionId = poll.options[0].id;

    const vote = await app.inject({
      method: 'POST',
      url: `/v1/polls/${poll.id}/vote`,
      headers: authHeader(user),
      payload: { optionIds: [optionId] },
    });
    expect(vote.statusCode).toBe(200);
    expect(vote.json().poll.totalVotes).toBe(1);
    expect(vote.json().poll.myVotes).toContain(optionId);

    const again = await app.inject({
      method: 'POST',
      url: `/v1/polls/${poll.id}/vote`,
      headers: authHeader(user),
      payload: { optionIds: [optionId] },
    });
    expect(again.statusCode).toBe(409);
  });

  it('etkinlik+anket SOSYAL feed e düşer, kariyer feed e düşmez', async () => {
    const social = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=social',
      headers: authHeader(user),
    });
    const types = (social.json().items as { type: string; post?: { type: string } }[])
      .filter((i) => i.type === 'post')
      .map((i) => i.post!.type);
    expect(types).toContain('event');
    expect(types).toContain('poll');
  });

  it('kariyer projesi CAREER feed e düşer, sosyal e sızmaz', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/career/projects',
      headers: authHeader(user),
      payload: { title: 'Açık kaynak kütüphane', techTags: ['ts', 'node'] },
    });

    const career = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=career',
      headers: authHeader(user),
    });
    const careerTypes = (career.json().items as { type: string; post?: { type: string; contentDomain: string } }[])
      .filter((i) => i.type === 'post')
      .map((i) => i.post!);
    expect(careerTypes.some((p) => p.type === 'project')).toBe(true);
    expect(careerTypes.every((p) => p.contentDomain === 'career')).toBe(true);

    const social = await app.inject({
      method: 'GET',
      url: '/v1/feed?domain=social',
      headers: authHeader(user),
    });
    const socialPosts = (social.json().items as { type: string; post?: { type: string } }[])
      .filter((i) => i.type === 'post')
      .map((i) => i.post!);
    expect(socialPosts.every((p) => p.type !== 'project')).toBe(true);
  });

  it('fırsat ilanı moderasyon kuyruğuna düşer (pending)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/career/opportunities',
      headers: authHeader(user),
      payload: { title: 'Staj — Frontend', type: 'internship', company: 'Acme' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().moderation).toBe('pending');

    const oppId = res.json().opportunity.id as string;

    // Onaysız fırsat listede görünmez (önceden onaylanmış ilanlar olsa bile).
    const list = await app.inject({
      method: 'GET',
      url: '/v1/career/opportunities',
      headers: authHeader(user),
    });
    const items = list.json().items as { id: string; moderationStatus?: string }[];
    expect(items.some((o) => o.id === oppId)).toBe(false);
    expect(items.every((o) => o.moderationStatus !== 'pending')).toBe(true);
  });
});
