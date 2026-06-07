import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

describe('Faz 5 — mesajlaşma', () => {
  let app: FastifyInstance;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;
  let dmId: string;

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

  it('DM oluşturur ve tekilleştirir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: authHeader(alice),
      payload: { type: 'dm', memberIds: [bob.userId] },
    });
    expect(res.statusCode).toBe(201);
    dmId = res.json().conversation.id;
    expect(res.json().conversation.peer.id).toBe(bob.userId);

    // Aynı DM tekrar istenince yeni oluşturulmaz.
    const again = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: authHeader(bob),
      payload: { type: 'dm', memberIds: [alice.userId] },
    });
    expect(again.json().conversation.id).toBe(dmId);
  });

  it('mesaj gönderir ve karşı taraf görür', async () => {
    const send = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${dmId}/messages`,
      headers: authHeader(alice),
      payload: { content: 'Selam Bob!' },
    });
    expect(send.statusCode).toBe(201);
    expect(send.json().message.mine).toBe(true);

    const list = await app.inject({
      method: 'GET',
      url: `/v1/conversations/${dmId}/messages`,
      headers: authHeader(bob),
    });
    expect(list.statusCode).toBe(200);
    const msgs = list.json().items as { content: string; mine: boolean }[];
    expect(msgs.at(-1)?.content).toBe('Selam Bob!');
    expect(msgs.at(-1)?.mine).toBe(false);
  });

  it('okunmamış sayısı ve okundu işareti çalışır', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/v1/conversations',
      headers: authHeader(bob),
    });
    const conv = (before.json().items as { id: string; unreadCount: number }[]).find((c) => c.id === dmId);
    expect(conv?.unreadCount).toBeGreaterThanOrEqual(1);

    const read = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${dmId}/read`,
      headers: authHeader(bob),
    });
    expect(read.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: '/v1/conversations',
      headers: authHeader(bob),
    });
    const conv2 = (after.json().items as { id: string; unreadCount: number }[]).find((c) => c.id === dmId);
    expect(conv2?.unreadCount).toBe(0);
  });

  it('gönderen çift-tik (readByPeer) görür', async () => {
    // Önceki testte Bob okudu; Alice kendi mesajında okundu bilgisini görmeli.
    const list = await app.inject({
      method: 'GET',
      url: `/v1/conversations/${dmId}/messages`,
      headers: authHeader(alice),
    });
    const mine = (list.json().items as { mine: boolean; readByPeer?: boolean }[]).filter((m) => m.mine);
    expect(mine.at(-1)?.readByPeer).toBe(true);
  });

  it('üye olmayan mesajları göremez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/conversations/${dmId}/messages`,
      headers: authHeader(carol),
    });
    expect(res.statusCode).toBe(403);
  });

  it('grup sohbeti oluşturur', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: authHeader(alice),
      payload: { type: 'group', title: 'Proje Ekibi', memberIds: [bob.userId, carol.userId] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().conversation.type).toBe('group');
    expect(res.json().conversation.memberCount).toBe(3);
  });

  it('boş mesaj reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${dmId}/messages`,
      headers: authHeader(alice),
      payload: { content: '   ' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('push cihaz token kaydeder', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/devices',
      headers: authHeader(alice),
      payload: { pushToken: 'ExponentPushToken[test-alice-001]', platform: 'expo' },
    });
    expect(res.statusCode).toBe(201);
  });
});
