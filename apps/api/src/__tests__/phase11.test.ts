import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

describe('Faz 11 — rekabetçi özellikler', () => {
  let app: FastifyInstance;
  let universityId: string;

  beforeAll(async () => {
    app = await buildApp();
    universityId = await getSeededUniversityId();
  });

  afterAll(async () => {
    await app.close();
  });

  async function follow(follower: TestUser, target: TestUser) {
    return app.inject({
      method: 'POST',
      url: `/v1/users/${target.userId}/follow`,
      headers: authHeader(follower),
    });
  }

  describe('Story + Close Friends', () => {
    it('takipçi public story görür ve izleyince hasUnseen kapanır', async () => {
      const author = await createTestUser(app, universityId);
      const viewer = await createTestUser(app, universityId);
      await follow(viewer, author);

      const created = await app.inject({
        method: 'POST',
        url: '/v1/stories',
        headers: authHeader(author),
        payload: { mediaUrl: 'https://cdn.test/s1.jpg', caption: 'merhaba' },
      });
      expect(created.statusCode).toBe(201);
      const storyId = created.json().story.id as string;

      const feed = await app.inject({ method: 'GET', url: '/v1/stories', headers: authHeader(viewer) });
      expect(feed.statusCode).toBe(200);
      const group = feed.json().items.find((g: any) => g.author.id === author.userId);
      expect(group).toBeTruthy();
      expect(group.hasUnseen).toBe(true);

      const view = await app.inject({
        method: 'POST',
        url: `/v1/stories/${storyId}/view`,
        headers: authHeader(viewer),
      });
      expect(view.statusCode).toBe(200);

      const feed2 = await app.inject({ method: 'GET', url: '/v1/stories', headers: authHeader(viewer) });
      const group2 = feed2.json().items.find((g: any) => g.author.id === author.userId);
      expect(group2.hasUnseen).toBe(false);
    });

    it('close_friends story yalnızca yakın arkadaşa görünür', async () => {
      const author = await createTestUser(app, universityId);
      const viewer = await createTestUser(app, universityId);
      await follow(viewer, author);

      await app.inject({
        method: 'POST',
        url: '/v1/stories',
        headers: authHeader(author),
        payload: { mediaUrl: 'https://cdn.test/cf.jpg', audience: 'close_friends' },
      });

      const before = await app.inject({
        method: 'GET',
        url: `/v1/stories/user/${author.userId}`,
        headers: authHeader(viewer),
      });
      expect(before.json().items.length).toBe(0);

      const add = await app.inject({
        method: 'POST',
        url: `/v1/close-friends/${viewer.userId}`,
        headers: authHeader(author),
      });
      expect(add.statusCode).toBe(201);

      const list = await app.inject({ method: 'GET', url: '/v1/close-friends', headers: authHeader(author) });
      expect(list.json().items.some((f: any) => f.userId === viewer.userId)).toBe(true);

      const after = await app.inject({
        method: 'GET',
        url: `/v1/stories/user/${author.userId}`,
        headers: authHeader(viewer),
      });
      expect(after.json().items.length).toBe(1);
    });
  });

  describe('Durum metni', () => {
    it('durum güncellenir ve profilde döner', async () => {
      const user = await createTestUser(app, universityId);
      const res = await app.inject({
        method: 'PUT',
        url: '/v1/users/me/status',
        headers: authHeader(user),
        payload: { statusText: 'Ders çalışıyorum', statusEmoji: '📚' },
      });
      expect(res.statusCode).toBe(200);

      const me = await app.inject({ method: 'GET', url: '/v1/users/me', headers: authHeader(user) });
      expect(me.json().user.statusText).toBe('Ders çalışıyorum');
      expect(me.json().user.statusEmoji).toBe('📚');
    });
  });

  describe('Bağlantı önerisi', () => {
    it('kampüsten kullanıcı önerilir', async () => {
      const a = await createTestUser(app, universityId);
      const b = await createTestUser(app, universityId);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/connections/suggestions',
        headers: authHeader(a),
      });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json().items)).toBe(true);
      expect(res.json().items.some((s: any) => s.id === b.userId)).toBe(true);
    });
  });

  describe('Kariyer — proje detay + milestone tebrik', () => {
    it('proje detayı sahibiyle döner', async () => {
      const user = await createTestUser(app, universityId);
      const created = await app.inject({
        method: 'POST',
        url: '/v1/career/projects',
        headers: authHeader(user),
        payload: { title: 'Bitirme Projesi', techTags: ['react'] },
      });
      const projectId = created.json().project.id as string;
      const detail = await app.inject({
        method: 'GET',
        url: `/v1/career/projects/${projectId}`,
        headers: authHeader(user),
      });
      expect(detail.statusCode).toBe(200);
      expect(detail.json().project.title).toBe('Bitirme Projesi');
      expect(detail.json().author.id).toBe(user.userId);
    });

    it('milestone tebrik bir kez sayılır', async () => {
      const owner = await createTestUser(app, universityId);
      const fan = await createTestUser(app, universityId);
      const created = await app.inject({
        method: 'POST',
        url: '/v1/career/milestones',
        headers: authHeader(owner),
        payload: { title: 'Mezun oldum' },
      });
      const milestoneId = created.json().milestone.id as string;

      const first = await app.inject({
        method: 'POST',
        url: `/v1/career/milestones/${milestoneId}/congrats`,
        headers: authHeader(fan),
      });
      expect(first.statusCode).toBe(200);
      expect(first.json().congratsCount).toBe(1);

      const dup = await app.inject({
        method: 'POST',
        url: `/v1/career/milestones/${milestoneId}/congrats`,
        headers: authHeader(fan),
      });
      expect(dup.json().congratsCount).toBe(1);

      const list = await app.inject({
        method: 'GET',
        url: `/v1/career/users/${owner.userId}/milestones`,
        headers: authHeader(fan),
      });
      expect(list.json().items[0].congratulatedByMe).toBe(true);
    });
  });

  describe('Topluluk — rol + pin + slow mode + sesli kanal', () => {
    it('rol atama, pin, slow mode, yazma izni ve sesli kanal çalışır', async () => {
      const owner = await createTestUser(app, universityId);
      const member = await createTestUser(app, universityId);

      const comm = await app.inject({
        method: 'POST',
        url: '/v1/communities',
        headers: authHeader(owner),
        payload: { name: 'Test Topluluk', visibility: 'public', joinMode: 'open' },
      });
      const communityId = comm.json().community.id as string;

      const join = await app.inject({
        method: 'POST',
        url: `/v1/communities/${communityId}/join`,
        headers: authHeader(member),
      });
      expect(join.json().status).toBe('active');

      // Rol atama → moderator
      const role = await app.inject({
        method: 'POST',
        url: `/v1/communities/${communityId}/members/${member.userId}/role`,
        headers: authHeader(owner),
        payload: { role: 'moderator' },
      });
      expect(role.statusCode).toBe(200);
      expect(role.json().role).toBe('moderator');

      // Varsayılan kanal
      const detail = await app.inject({
        method: 'GET',
        url: `/v1/communities/${communityId}`,
        headers: authHeader(owner),
      });
      const channelId = detail.json().community.channels.find((c: any) => c.isDefault).id as string;

      // Mesaj gönder + pin
      const msg = await app.inject({
        method: 'POST',
        url: `/v1/channels/${channelId}/messages`,
        headers: authHeader(member),
        payload: { content: 'sabitlenecek' },
      });
      const msgId = msg.json().message.id as string;
      const pin = await app.inject({
        method: 'POST',
        url: `/v1/channels/${channelId}/messages/${msgId}/pin`,
        headers: authHeader(owner),
      });
      expect(pin.statusCode).toBe(200);
      const pins = await app.inject({
        method: 'GET',
        url: `/v1/channels/${channelId}/pins`,
        headers: authHeader(member),
      });
      expect(pins.json().items.length).toBe(1);

      // Slow mode kanalı
      const slowCh = await app.inject({
        method: 'POST',
        url: `/v1/communities/${communityId}/channels`,
        headers: authHeader(owner),
        payload: { name: 'yavas', slowModeSeconds: 60 },
      });
      const slowId = slowCh.json().channel.id as string;
      const s1 = await app.inject({
        method: 'POST',
        url: `/v1/channels/${slowId}/messages`,
        headers: authHeader(member),
        payload: { content: 'ilk' },
      });
      expect(s1.statusCode).toBe(201);
      const s2 = await app.inject({
        method: 'POST',
        url: `/v1/channels/${slowId}/messages`,
        headers: authHeader(member),
        payload: { content: 'ikinci' },
      });
      expect(s2.statusCode).toBe(429);

      // Yalnızca admin yazabilen kanal — moderator engellenir
      const annCh = await app.inject({
        method: 'POST',
        url: `/v1/communities/${communityId}/channels`,
        headers: authHeader(owner),
        payload: { name: 'duyuru', writeMinRole: 'admin' },
      });
      const annId = annCh.json().channel.id as string;
      const blocked = await app.inject({
        method: 'POST',
        url: `/v1/channels/${annId}/messages`,
        headers: authHeader(member),
        payload: { content: 'yazamam' },
      });
      expect(blocked.statusCode).toBe(403);

      // Sesli kanal
      const voiceCh = await app.inject({
        method: 'POST',
        url: `/v1/communities/${communityId}/channels`,
        headers: authHeader(owner),
        payload: { name: 'sesli', type: 'voice' },
      });
      const voiceId = voiceCh.json().channel.id as string;
      const voiceJoin = await app.inject({
        method: 'POST',
        url: `/v1/channels/${voiceId}/voice/join`,
        headers: authHeader(member),
      });
      expect(voiceJoin.statusCode).toBe(200);
      expect(voiceJoin.json().provider).toBe('stub');
      const voiceText = await app.inject({
        method: 'POST',
        url: `/v1/channels/${voiceId}/messages`,
        headers: authHeader(member),
        payload: { content: 'olmaz' },
      });
      expect(voiceText.statusCode).toBe(400);
    });
  });

  describe('Mesajlaşma — disappearing + view-once', () => {
    it('disappearing timer mesaja süre damgalar', async () => {
      const a = await createTestUser(app, universityId);
      const b = await createTestUser(app, universityId);
      const conv = await app.inject({
        method: 'POST',
        url: '/v1/conversations',
        headers: authHeader(a),
        payload: { type: 'dm', memberIds: [b.userId] },
      });
      const convId = conv.json().conversation.id as string;

      const set = await app.inject({
        method: 'POST',
        url: `/v1/conversations/${convId}/disappearing`,
        headers: authHeader(a),
        payload: { seconds: 86400 },
      });
      expect(set.json().disappearingSeconds).toBe(86400);

      await app.inject({
        method: 'POST',
        url: `/v1/conversations/${convId}/messages`,
        headers: authHeader(a),
        payload: { content: 'gizli' },
      });
      const msgs = await app.inject({
        method: 'GET',
        url: `/v1/conversations/${convId}/messages`,
        headers: authHeader(a),
      });
      expect(msgs.json().items[0].expiresAt).toBeTruthy();
    });

    it('view-once medya bir kez görüntülenir', async () => {
      const a = await createTestUser(app, universityId);
      const b = await createTestUser(app, universityId);
      const conv = await app.inject({
        method: 'POST',
        url: '/v1/conversations',
        headers: authHeader(a),
        payload: { type: 'dm', memberIds: [b.userId] },
      });
      const convId = conv.json().conversation.id as string;

      const sent = await app.inject({
        method: 'POST',
        url: `/v1/conversations/${convId}/messages`,
        headers: authHeader(a),
        payload: { mediaUrl: 'https://cdn.test/secret.jpg', viewOnce: true },
      });
      const msgId = sent.json().message.id as string;

      // Alıcı listede medyayı görmez.
      const list = await app.inject({
        method: 'GET',
        url: `/v1/conversations/${convId}/messages`,
        headers: authHeader(b),
      });
      const seen = list.json().items.find((m: any) => m.id === msgId);
      expect(seen.viewOnce).toBe(true);
      expect(seen.mediaUrl).toBeUndefined();

      // İlk açış → medya döner.
      const view1 = await app.inject({
        method: 'POST',
        url: `/v1/messages/${msgId}/view`,
        headers: authHeader(b),
      });
      expect(view1.statusCode).toBe(200);
      expect(view1.json().mediaUrl).toBe('https://cdn.test/secret.jpg');

      // İkinci açış → 410.
      const view2 = await app.inject({
        method: 'POST',
        url: `/v1/messages/${msgId}/view`,
        headers: authHeader(b),
      });
      expect(view2.statusCode).toBe(410);
    });
  });
});
