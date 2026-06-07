import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

describe('Faz 6 — topluluklar ve üyelik', () => {
  let app: FastifyInstance;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;
  let openId: string;
  let channelId: string;

  beforeAll(async () => {
    app = await buildApp();
    const universityId = await getSeededUniversityId();
    alice = await createTestUser(app, universityId);
    bob = await createTestUser(app, universityId);
    carol = await createTestUser(app, universityId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('topluluk oluşturur: owner + varsayılan kanal', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/communities',
      headers: authHeader(alice),
      payload: { name: 'Yazılım Kulübü', visibility: 'public', joinMode: 'open' },
    });
    expect(res.statusCode).toBe(201);
    openId = res.json().community.id;
    expect(res.json().community.memberCount).toBe(1);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/communities/${openId}`,
      headers: authHeader(alice),
    });
    expect(detail.json().community.viewerRole).toBe('owner');
    expect(detail.json().community.viewerStatus).toBe('active');
    const channels = detail.json().community.channels as { id: string; name: string }[];
    expect(channels.length).toBeGreaterThanOrEqual(1);
    channelId = channels[0]!.id;
  });

  it('open toplulukta direkt katılır', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/communities/${openId}/join`,
      headers: authHeader(bob),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('active');
  });

  it('request toplulukta istek gönderilir ve onaylanır', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/communities',
      headers: authHeader(alice),
      payload: { name: 'Robotik Takımı', visibility: 'public', joinMode: 'request' },
    });
    const reqId = create.json().community.id;

    const join = await app.inject({
      method: 'POST',
      url: `/v1/communities/${reqId}/join`,
      headers: authHeader(bob),
      payload: {},
    });
    expect(join.json().status).toBe('pending');

    const queue = await app.inject({
      method: 'GET',
      url: `/v1/communities/${reqId}/requests`,
      headers: authHeader(alice),
    });
    expect((queue.json().items as { userId: string }[]).some((r) => r.userId === bob.userId)).toBe(true);

    const approve = await app.inject({
      method: 'POST',
      url: `/v1/communities/${reqId}/requests/${bob.userId}/approve`,
      headers: authHeader(alice),
    });
    expect(approve.statusCode).toBe(200);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/communities/${reqId}`,
      headers: authHeader(bob),
    });
    expect(detail.json().community.viewerStatus).toBe('active');
  });

  it('invite toplulukta sadece davet linkiyle katılınır', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/communities',
      headers: authHeader(alice),
      payload: { name: 'Gizli Ekip', visibility: 'unlisted', joinMode: 'invite' },
    });
    const inviteCommunityId = create.json().community.id;

    const blocked = await app.inject({
      method: 'POST',
      url: `/v1/communities/${inviteCommunityId}/join`,
      headers: authHeader(bob),
      payload: {},
    });
    expect(blocked.statusCode).toBe(403);

    const invite = await app.inject({
      method: 'POST',
      url: `/v1/communities/${inviteCommunityId}/invites`,
      headers: authHeader(alice),
      payload: { maxUses: 5 },
    });
    expect(invite.statusCode).toBe(201);
    const token = invite.json().invite.token as string;

    const joined = await app.inject({
      method: 'POST',
      url: `/v1/join/${token}`,
      headers: authHeader(bob),
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.json().status).toBe('active');
  });

  it('kanal mesajı: üye gönderir/okur, üye olmayan göremez', async () => {
    const send = await app.inject({
      method: 'POST',
      url: `/v1/channels/${channelId}/messages`,
      headers: authHeader(alice),
      payload: { content: 'Herkese merhaba!' },
    });
    expect(send.statusCode).toBe(201);

    const read = await app.inject({
      method: 'GET',
      url: `/v1/channels/${channelId}/messages`,
      headers: authHeader(bob),
    });
    expect(read.statusCode).toBe(200);
    expect((read.json().items as { content: string }[]).some((m) => m.content === 'Herkese merhaba!')).toBe(
      true,
    );

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/channels/${channelId}/messages`,
      headers: authHeader(carol),
    });
    expect(denied.statusCode).toBe(403);
  });

  it('keşfet yalnızca public toplulukları listeler', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/communities',
      headers: authHeader(alice),
      payload: { name: 'Özel Oda', visibility: 'private', joinMode: 'request' },
    });
    const privateId = create.json().community.id;

    const discover = await app.inject({
      method: 'GET',
      url: '/v1/communities',
      headers: authHeader(carol),
    });
    const items = discover.json().items as { id: string; visibility: string }[];
    expect(items.every((c) => c.visibility === 'public')).toBe(true);
    expect(items.some((c) => c.id === privateId)).toBe(false);
  });

  it('üye topluluktan ayrılır', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/communities/${openId}/leave`,
      headers: authHeader(bob),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('left');
  });
});
