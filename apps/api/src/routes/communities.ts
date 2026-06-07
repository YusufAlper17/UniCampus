import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import {
  assignRoleSchema,
  createChannelV2Schema,
  createCommunitySchema,
  createInviteLinkSchema,
  sendChannelMessageSchema,
  type ChannelMessage,
  type Community,
  type CommunityChannel,
  type CommunityDetail,
  type CommunityMember,
  type InviteLink,
  type MemberRole,
} from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { publishToUsers } from '../lib/realtime.js';

const APP_JOIN_BASE = 'https://unicampus.app/join';

export const communityRoutes: FastifyPluginAsync = async (app) => {
  // Topluluk oluştur — kurucu owner olur, varsayılan "genel" kanalı açılır.
  app.post('/communities', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createCommunitySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;
    const [community] = await db
      .insert(schema.communities)
      .values({
        universityId: auth.university_id,
        ownerId: auth.sub,
        type: input.type,
        name: input.name,
        description: input.description,
        category: input.category,
        visibility: input.visibility,
        joinMode: input.joinMode,
        memberCount: 1,
      })
      .returning();
    if (!community) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Oluşturulamadı' } });
    }
    await db
      .insert(schema.communityMembers)
      .values({ communityId: community.id, userId: auth.sub, role: 'owner', status: 'active' });
    await db
      .insert(schema.communityChannels)
      .values({ communityId: community.id, name: 'genel', position: 0, isDefault: true });

    return reply.code(201).send({ community: serializeCommunity(community) });
  });

  // Keşfet (public) veya kendi topluluklarım (?mine=true).
  app.get('/communities', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { mine, cursor, limit: rawLimit } = req.query as {
      mine?: string;
      cursor?: string;
      limit?: string;
    };
    const limit = Math.min(Number(rawLimit) || 20, 50);

    if (mine === 'true') {
      const memberships = await db
        .select({ communityId: schema.communityMembers.communityId })
        .from(schema.communityMembers)
        .where(
          and(
            eq(schema.communityMembers.userId, auth.sub),
            eq(schema.communityMembers.status, 'active'),
          ),
        );
      const ids = memberships.map((m) => m.communityId);
      if (!ids.length) return reply.send({ items: [], nextCursor: null });
      const rows = await db
        .select()
        .from(schema.communities)
        .where(inArray(schema.communities.id, ids))
        .orderBy(desc(schema.communities.createdAt));
      return reply.send({ items: rows.map(serializeCommunity), nextCursor: null });
    }

    const cursorMs = cursor ? Number(cursor) : null;
    const rows = await db
      .select()
      .from(schema.communities)
      .where(
        and(
          eq(schema.communities.universityId, auth.university_id),
          eq(schema.communities.visibility, 'public'),
          cursorMs ? lt(schema.communities.createdAt, new Date(cursorMs)) : undefined,
        ),
      )
      .orderBy(desc(schema.communities.createdAt))
      .limit(limit);
    const last = rows[rows.length - 1];
    const nextCursor = rows.length === limit && last ? String(last.createdAt.getTime()) : null;
    return reply.send({ items: rows.map(serializeCommunity), nextCursor });
  });

  // Topluluk detayı — görünürlüğe göre erişim; üyeyse kanallar döner.
  app.get('/communities/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const community = await getCommunity(id, auth.university_id);
    if (!community) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Topluluk yok' } });
    }
    const membership = await getMembership(id, auth.sub);
    const isActiveMember = membership?.status === 'active';

    if (community.visibility === 'private' && !isActiveMember) {
      // Gizli topluluk: metadata sınırlı, içerik yok.
      const pendingReq = await getPendingRequest(id, auth.sub);
      const detail: CommunityDetail = {
        ...serializeCommunity(community),
        viewerRole: null,
        viewerStatus: pendingReq ? 'pending' : 'none',
      };
      return reply.send({ community: detail });
    }

    const pendingReq = isActiveMember ? null : await getPendingRequest(id, auth.sub);
    const channels = isActiveMember
      ? await db
          .select()
          .from(schema.communityChannels)
          .where(eq(schema.communityChannels.communityId, id))
          .orderBy(schema.communityChannels.position)
      : [];

    const detail: CommunityDetail = {
      ...serializeCommunity(community),
      viewerRole: membership?.role ?? null,
      viewerStatus: isActiveMember ? 'active' : pendingReq ? 'pending' : 'none',
      channels: channels.map(serializeChannel),
    };
    return reply.send({ community: detail });
  });

  // Katıl — join moduna göre davran.
  app.post('/communities/:id/join', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const community = await getCommunity(id, auth.university_id);
    if (!community) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Topluluk yok' } });
    }
    const membership = await getMembership(id, auth.sub);
    if (membership?.status === 'banned') {
      return reply.code(403).send({ error: { code: 'banned', message: 'Bu topluluktan engellendin' } });
    }
    if (membership?.status === 'active') {
      return reply.send({ status: 'active' });
    }

    if (community.joinMode === 'open') {
      await addMember(id, auth.sub);
      return reply.send({ status: 'active' });
    }
    if (community.joinMode === 'request') {
      await db
        .insert(schema.membershipRequests)
        .values({ communityId: id, userId: auth.sub, status: 'pending' })
        .onConflictDoUpdate({
          target: [schema.membershipRequests.communityId, schema.membershipRequests.userId],
          set: { status: 'pending', createdAt: new Date() },
        });
      return reply.send({ status: 'pending' });
    }
    // invite
    return reply
      .code(403)
      .send({ error: { code: 'invite_only', message: 'Sadece davet linkiyle katılınır' } });
  });

  // Ayrıl.
  app.post('/communities/:id/leave', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const membership = await getMembership(id, auth.sub);
    if (!membership || membership.status !== 'active') {
      return reply.code(400).send({ error: { code: 'not_member', message: 'Üye değilsin' } });
    }
    if (membership.role === 'owner') {
      return reply
        .code(403)
        .send({ error: { code: 'owner_cannot_leave', message: 'Önce sahipliği devret' } });
    }
    await db
      .delete(schema.communityMembers)
      .where(
        and(
          eq(schema.communityMembers.communityId, id),
          eq(schema.communityMembers.userId, auth.sub),
        ),
      );
    await db
      .update(schema.communities)
      .set({ memberCount: sql`GREATEST(${schema.communities.memberCount} - 1, 0)` })
      .where(eq(schema.communities.id, id));
    return reply.send({ status: 'left' });
  });

  // Üye listesi (aktif). Yalnızca üyeler görebilir.
  app.get('/communities/:id/members', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    if (!(await isActiveMember(id, auth.sub))) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Üye değilsin' } });
    }
    const rows = await db
      .select({
        communityId: schema.communityMembers.communityId,
        userId: schema.communityMembers.userId,
        role: schema.communityMembers.role,
        status: schema.communityMembers.status,
        joinedAt: schema.communityMembers.joinedAt,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.communityMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.communityMembers.userId))
      .where(eq(schema.communityMembers.communityId, id))
      .orderBy(schema.communityMembers.joinedAt);
    const items: CommunityMember[] = rows.map((r) => ({
      communityId: r.communityId,
      userId: r.userId,
      role: r.role,
      status: r.status,
      joinedAt: r.joinedAt.toISOString(),
      username: r.username,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl ?? undefined,
    }));
    return reply.send({ items });
  });

  // Bekleyen üyelik istekleri (yönetici).
  app.get('/communities/:id/requests', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const membership = await getMembership(id, auth.sub);
    if (!membership || !isManager(membership.role)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Yetki yok' } });
    }
    const rows = await db
      .select({
        userId: schema.membershipRequests.userId,
        createdAt: schema.membershipRequests.createdAt,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.membershipRequests)
      .innerJoin(schema.users, eq(schema.users.id, schema.membershipRequests.userId))
      .where(
        and(
          eq(schema.membershipRequests.communityId, id),
          eq(schema.membershipRequests.status, 'pending'),
        ),
      )
      .orderBy(schema.membershipRequests.createdAt);
    return reply.send({
      items: rows.map((r) => ({
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });

  // İsteği onayla (yönetici).
  app.post(
    '/communities/:id/requests/:userId/approve',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const auth = requireAuth(req, reply);
      if (!auth) return;
      const { id, userId } = req.params as { id: string; userId: string };
      const membership = await getMembership(id, auth.sub);
      if (!membership || !isManager(membership.role)) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Yetki yok' } });
      }
      const pending = await getPendingRequest(id, userId);
      if (!pending) {
        return reply.code(404).send({ error: { code: 'not_found', message: 'İstek yok' } });
      }
      await addMember(id, userId);
      await db
        .update(schema.membershipRequests)
        .set({ status: 'accepted' })
        .where(
          and(
            eq(schema.membershipRequests.communityId, id),
            eq(schema.membershipRequests.userId, userId),
          ),
        );
      return reply.send({ status: 'approved' });
    },
  );

  // İsteği reddet (yönetici).
  app.post(
    '/communities/:id/requests/:userId/reject',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const auth = requireAuth(req, reply);
      if (!auth) return;
      const { id, userId } = req.params as { id: string; userId: string };
      const membership = await getMembership(id, auth.sub);
      if (!membership || !isManager(membership.role)) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Yetki yok' } });
      }
      await db
        .update(schema.membershipRequests)
        .set({ status: 'rejected' })
        .where(
          and(
            eq(schema.membershipRequests.communityId, id),
            eq(schema.membershipRequests.userId, userId),
          ),
        );
      return reply.send({ status: 'rejected' });
    },
  );

  // Kanal oluştur (yönetici).
  app.post('/communities/:id/channels', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const membership = await getMembership(id, auth.sub);
    if (!membership || !isManager(membership.role)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Yetki yok' } });
    }
    const parsed = createChannelV2Schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.communityChannels)
      .where(eq(schema.communityChannels.communityId, id));
    const position = countRows[0]?.count ?? 0;
    const [channel] = await db
      .insert(schema.communityChannels)
      .values({
        communityId: id,
        name: parsed.data.name,
        description: parsed.data.description,
        type: parsed.data.type,
        writeMinRole: parsed.data.writeMinRole,
        slowModeSeconds: parsed.data.slowModeSeconds,
        position,
      })
      .returning();
    return reply.code(201).send({ channel: channel ? serializeChannel(channel) : null });
  });

  // Üye rolü ata/değiştir (Faz 11 — Discord tarzı). Owner her rolü, admin
  // yalnızca moderator/member atayabilir; owner rolü bu uçtan verilemez.
  app.post(
    '/communities/:id/members/:userId/role',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const auth = requireAuth(req, reply);
      if (!auth) return;
      const { id, userId } = req.params as { id: string; userId: string };
      const parsed = assignRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
        });
      }
      const newRole = parsed.data.role;
      if (newRole === 'owner') {
        return reply.code(400).send({ error: { code: 'invalid_role', message: 'Sahiplik bu uçtan atanamaz' } });
      }
      const actor = await getMembership(id, auth.sub);
      if (!actor || !isManager(actor.role)) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Yetki yok' } });
      }
      // Admin yalnızca moderator/member atayabilir.
      if (actor.role === 'admin' && newRole === 'admin') {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Yalnızca sahip admin atayabilir' } });
      }
      const target = await getMembership(id, userId);
      if (!target || target.status !== 'active') {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Aktif üye değil' } });
      }
      if (target.role === 'owner') {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Sahibin rolü değiştirilemez' } });
      }
      await db
        .update(schema.communityMembers)
        .set({ role: newRole })
        .where(
          and(
            eq(schema.communityMembers.communityId, id),
            eq(schema.communityMembers.userId, userId),
          ),
        );
      return reply.send({ userId, role: newRole });
    },
  );

  // Kanal mesajları (üye).
  app.get('/channels/:id/messages', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const channel = await getChannel(id);
    if (!channel || !(await isActiveMember(channel.communityId, auth.sub))) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Erişim yok' } });
    }
    const { cursor, limit: rawLimit } = req.query as { cursor?: string; limit?: string };
    const limit = Math.min(Number(rawLimit) || 30, 50);
    const cursorMs = cursor ? Number(cursor) : null;
    const rows = await db
      .select({
        id: schema.channelMessages.id,
        channelId: schema.channelMessages.channelId,
        communityId: schema.channelMessages.communityId,
        senderId: schema.channelMessages.senderId,
        content: schema.channelMessages.content,
        mediaUrl: schema.channelMessages.mediaUrl,
        parentMessageId: schema.channelMessages.parentMessageId,
        pinnedAt: schema.channelMessages.pinnedAt,
        createdAt: schema.channelMessages.createdAt,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.channelMessages)
      .innerJoin(schema.users, eq(schema.users.id, schema.channelMessages.senderId))
      .where(
        and(
          eq(schema.channelMessages.channelId, id),
          cursorMs ? lt(schema.channelMessages.createdAt, new Date(cursorMs)) : undefined,
        ),
      )
      .orderBy(desc(schema.channelMessages.createdAt))
      .limit(limit);

    const last = rows[rows.length - 1];
    const nextCursor = rows.length === limit && last ? String(last.createdAt.getTime()) : null;
    const items: ChannelMessage[] = rows.reverse().map((r) => ({
      id: r.id,
      channelId: r.channelId,
      communityId: r.communityId,
      senderId: r.senderId,
      content: r.content ?? undefined,
      mediaUrl: r.mediaUrl ?? undefined,
      parentMessageId: r.parentMessageId ?? undefined,
      pinned: !!r.pinnedAt,
      createdAt: r.createdAt.toISOString(),
      mine: r.senderId === auth.sub,
      sender: { username: r.username, displayName: r.displayName, avatarUrl: r.avatarUrl ?? undefined },
    }));
    return reply.send({ items, nextCursor });
  });

  // Kanala mesaj gönder (üye) — aktif üyelere realtime yayınla.
  app.post('/channels/:id/messages', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const channel = await getChannel(id);
    if (!channel) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kanal yok' } });
    }
    const membership = await getMembership(channel.communityId, auth.sub);
    if (!membership || membership.status !== 'active') {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Erişim yok' } });
    }
    if (channel.type === 'voice') {
      return reply.code(400).send({ error: { code: 'voice_channel', message: 'Sesli kanala mesaj atılamaz' } });
    }
    // Yazma izni eşiği (Faz 11): örn. yalnızca moderator+ yazabilen duyuru kanalı.
    if (roleRank(membership.role) < roleRank(channel.writeMinRole)) {
      return reply.code(403).send({ error: { code: 'write_forbidden', message: 'Bu kanala yazma yetkin yok' } });
    }
    const parsed = sendChannelMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    // Slow mode: yöneticiler muaf; üyeler için son mesajdan beri geçen süre kontrolü.
    if (channel.slowModeSeconds > 0 && !isManager(membership.role)) {
      const [last] = await db
        .select({ createdAt: schema.channelMessages.createdAt })
        .from(schema.channelMessages)
        .where(
          and(
            eq(schema.channelMessages.channelId, id),
            eq(schema.channelMessages.senderId, auth.sub),
          ),
        )
        .orderBy(desc(schema.channelMessages.createdAt))
        .limit(1);
      if (last) {
        const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
        if (elapsed < channel.slowModeSeconds) {
          return reply.code(429).send({
            error: {
              code: 'slow_mode',
              message: `Yavaş mod aktif, ${Math.ceil(channel.slowModeSeconds - elapsed)}sn bekle`,
            },
          });
        }
      }
    }
    const [msg] = await db
      .insert(schema.channelMessages)
      .values({
        channelId: id,
        communityId: channel.communityId,
        senderId: auth.sub,
        content: parsed.data.content?.trim(),
        mediaUrl: parsed.data.mediaUrl,
        parentMessageId: parsed.data.parentMessageId,
      })
      .returning();
    if (!msg) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Gönderilemedi' } });
    }

    const memberIds = await db
      .select({ userId: schema.communityMembers.userId })
      .from(schema.communityMembers)
      .where(
        and(
          eq(schema.communityMembers.communityId, channel.communityId),
          eq(schema.communityMembers.status, 'active'),
        ),
      );
    void publishToUsers(
      memberIds.map((m) => m.userId).filter((uid) => uid !== auth.sub),
      { kind: 'channel_message', channelId: id, communityId: channel.communityId, message: msg },
    );

    return reply.code(201).send({
      message: {
        id: msg.id,
        channelId: msg.channelId,
        communityId: msg.communityId,
        senderId: msg.senderId,
        content: msg.content ?? undefined,
        mediaUrl: msg.mediaUrl ?? undefined,
        parentMessageId: msg.parentMessageId ?? undefined,
        pinned: false,
        createdAt: msg.createdAt.toISOString(),
        mine: true,
      } satisfies ChannelMessage,
    });
  });

  // Mesajı sabitle/kaldır (Faz 11 — yönetici).
  app.post('/channels/:id/messages/:msgId/pin', { onRequest: [app.authenticate] }, (req, reply) =>
    setPin(req, reply, true),
  );
  app.delete('/channels/:id/messages/:msgId/pin', { onRequest: [app.authenticate] }, (req, reply) =>
    setPin(req, reply, false),
  );

  // Sabitlenen mesajlar (üye).
  app.get('/channels/:id/pins', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const channel = await getChannel(id);
    if (!channel || !(await isActiveMember(channel.communityId, auth.sub))) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Erişim yok' } });
    }
    const rows = await db
      .select({
        id: schema.channelMessages.id,
        channelId: schema.channelMessages.channelId,
        communityId: schema.channelMessages.communityId,
        senderId: schema.channelMessages.senderId,
        content: schema.channelMessages.content,
        mediaUrl: schema.channelMessages.mediaUrl,
        createdAt: schema.channelMessages.createdAt,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.channelMessages)
      .innerJoin(schema.users, eq(schema.users.id, schema.channelMessages.senderId))
      .where(and(eq(schema.channelMessages.channelId, id), isNotNull(schema.channelMessages.pinnedAt)))
      .orderBy(desc(schema.channelMessages.pinnedAt));
    const items: ChannelMessage[] = rows.map((r) => ({
      id: r.id,
      channelId: r.channelId,
      communityId: r.communityId,
      senderId: r.senderId,
      content: r.content ?? undefined,
      mediaUrl: r.mediaUrl ?? undefined,
      pinned: true,
      createdAt: r.createdAt.toISOString(),
      mine: r.senderId === auth.sub,
      sender: { username: r.username, displayName: r.displayName, avatarUrl: r.avatarUrl ?? undefined },
    }));
    return reply.send({ items });
  });

  // Sesli kanal katılımı (Faz 12 — hazırlık/stub). Gerçek SFU entegrasyonu lansman sonrası.
  app.post('/channels/:id/voice/join', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const channel = await getChannel(id);
    if (!channel || !(await isActiveMember(channel.communityId, auth.sub))) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Erişim yok' } });
    }
    if (channel.type !== 'voice') {
      return reply.code(400).send({ error: { code: 'not_voice', message: 'Bu kanal sesli değil' } });
    }
    // Stub token — istemci SFU bağlantısını lansman sonrası kuracak.
    return reply.send({
      provider: 'stub',
      channelId: id,
      roomName: `voice_${id}`,
      token: `stub_${id}_${auth.sub}`,
      message: 'Sesli kanal altyapısı hazır (lansman sonrası aktif edilecek)',
    });
  });

  // Davet linki oluştur (yönetici).
  app.post('/communities/:id/invites', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const membership = await getMembership(id, auth.sub);
    if (!membership || !isManager(membership.role)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Yetki yok' } });
    }
    const parsed = createInviteLinkSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const token = randomBytes(9).toString('base64url');
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000)
      : null;
    const [link] = await db
      .insert(schema.inviteLinks)
      .values({
        communityId: id,
        token,
        createdBy: auth.sub,
        maxUses: parsed.data.maxUses,
        expiresAt,
      })
      .returning();
    if (!link) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Oluşturulamadı' } });
    }
    const result: InviteLink = {
      token: link.token,
      url: `${APP_JOIN_BASE}/${link.token}`,
      maxUses: link.maxUses ?? undefined,
      useCount: link.useCount,
      expiresAt: link.expiresAt?.toISOString(),
    };
    return reply.code(201).send({ invite: result });
  });

  // Davet linkiyle katıl — join modunu bypass eder.
  app.post('/join/:token', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { token } = req.params as { token: string };
    const [link] = await db
      .select()
      .from(schema.inviteLinks)
      .where(eq(schema.inviteLinks.token, token))
      .limit(1);
    if (!link) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Geçersiz davet' } });
    }
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      return reply.code(410).send({ error: { code: 'expired', message: 'Davet süresi doldu' } });
    }
    if (link.maxUses != null && link.useCount >= link.maxUses) {
      return reply.code(410).send({ error: { code: 'exhausted', message: 'Davet limiti doldu' } });
    }
    const community = await getCommunity(link.communityId, auth.university_id);
    if (!community) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Topluluk yok' } });
    }
    const membership = await getMembership(link.communityId, auth.sub);
    if (membership?.status === 'banned') {
      return reply.code(403).send({ error: { code: 'banned', message: 'Engellendin' } });
    }
    if (membership?.status !== 'active') {
      await addMember(link.communityId, auth.sub);
      await db
        .update(schema.inviteLinks)
        .set({ useCount: sql`${schema.inviteLinks.useCount} + 1` })
        .where(eq(schema.inviteLinks.id, link.id));
    }
    return reply.send({ communityId: link.communityId, status: 'active' });
  });

  // Thread yanıtları (Faz 11) — bir mesajın altındaki yanıt zinciri.
  app.get('/channels/:id/threads/:msgId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id, msgId } = req.params as { id: string; msgId: string };
    const channel = await getChannel(id);
    if (!channel || !(await isActiveMember(channel.communityId, auth.sub))) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Erişim yok' } });
    }
    const rows = await db
      .select({
        id: schema.channelMessages.id,
        channelId: schema.channelMessages.channelId,
        communityId: schema.channelMessages.communityId,
        senderId: schema.channelMessages.senderId,
        content: schema.channelMessages.content,
        mediaUrl: schema.channelMessages.mediaUrl,
        parentMessageId: schema.channelMessages.parentMessageId,
        createdAt: schema.channelMessages.createdAt,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.channelMessages)
      .innerJoin(schema.users, eq(schema.users.id, schema.channelMessages.senderId))
      .where(eq(schema.channelMessages.parentMessageId, msgId))
      .orderBy(schema.channelMessages.createdAt);
    const items: ChannelMessage[] = rows.map((r) => ({
      id: r.id,
      channelId: r.channelId,
      communityId: r.communityId,
      senderId: r.senderId,
      content: r.content ?? undefined,
      mediaUrl: r.mediaUrl ?? undefined,
      parentMessageId: r.parentMessageId ?? undefined,
      createdAt: r.createdAt.toISOString(),
      mine: r.senderId === auth.sub,
      sender: { username: r.username, displayName: r.displayName, avatarUrl: r.avatarUrl ?? undefined },
    }));
    return reply.send({ items });
  });
};

// ---- helpers ----

function isManager(role: string): boolean {
  return role === 'owner' || role === 'admin';
}

const ROLE_RANK: Record<MemberRole, number> = { member: 0, moderator: 1, admin: 2, owner: 3 };
function roleRank(role: MemberRole): number {
  return ROLE_RANK[role] ?? 0;
}

// Mesaj sabitleme yardımcı (pin/unpin paylaşır).
async function setPin(req: FastifyRequest, reply: FastifyReply, pin: boolean): Promise<unknown> {
  const auth = requireAuth(req, reply);
  if (!auth) return;
  const { id, msgId } = req.params as { id: string; msgId: string };
  const channel = await getChannel(id);
  if (!channel) {
    return reply.code(404).send({ error: { code: 'not_found', message: 'Kanal yok' } });
  }
  const membership = await getMembership(channel.communityId, auth.sub);
  if (!membership || !isManager(membership.role)) {
    return reply.code(403).send({ error: { code: 'forbidden', message: 'Yetki yok' } });
  }
  const updated = await db
    .update(schema.channelMessages)
    .set({ pinnedAt: pin ? new Date() : null })
    .where(and(eq(schema.channelMessages.id, msgId), eq(schema.channelMessages.channelId, id)))
    .returning({ id: schema.channelMessages.id });
  if (!updated.length) {
    return reply.code(404).send({ error: { code: 'not_found', message: 'Mesaj yok' } });
  }
  return reply.send({ pinned: pin });
}

async function getCommunity(id: string, universityId: string) {
  const [c] = await db.select().from(schema.communities).where(eq(schema.communities.id, id)).limit(1);
  if (!c || c.universityId !== universityId) return null;
  return c;
}

async function getMembership(communityId: string, userId: string) {
  const [m] = await db
    .select()
    .from(schema.communityMembers)
    .where(
      and(
        eq(schema.communityMembers.communityId, communityId),
        eq(schema.communityMembers.userId, userId),
      ),
    )
    .limit(1);
  return m ?? null;
}

async function isActiveMember(communityId: string, userId: string): Promise<boolean> {
  const m = await getMembership(communityId, userId);
  return m?.status === 'active';
}

async function getPendingRequest(communityId: string, userId: string) {
  const [r] = await db
    .select()
    .from(schema.membershipRequests)
    .where(
      and(
        eq(schema.membershipRequests.communityId, communityId),
        eq(schema.membershipRequests.userId, userId),
        eq(schema.membershipRequests.status, 'pending'),
      ),
    )
    .limit(1);
  return r ?? null;
}

async function getChannel(id: string) {
  const [c] = await db
    .select()
    .from(schema.communityChannels)
    .where(eq(schema.communityChannels.id, id))
    .limit(1);
  return c ?? null;
}

// Aktif üye ekle (varsa güncelle) ve üye sayısını artır (yalnızca yeni eklemede).
async function addMember(communityId: string, userId: string): Promise<void> {
  const existing = await getMembership(communityId, userId);
  await db
    .insert(schema.communityMembers)
    .values({ communityId, userId, role: 'member', status: 'active' })
    .onConflictDoUpdate({
      target: [schema.communityMembers.communityId, schema.communityMembers.userId],
      set: { status: 'active' },
    });
  if (existing?.status !== 'active') {
    await db
      .update(schema.communities)
      .set({ memberCount: sql`${schema.communities.memberCount} + 1` })
      .where(eq(schema.communities.id, communityId));
  }
}

function serializeCommunity(c: typeof schema.communities.$inferSelect): Community {
  return {
    id: c.id,
    universityId: c.universityId,
    ownerId: c.ownerId,
    type: c.type,
    name: c.name,
    description: c.description ?? undefined,
    coverUrl: c.coverUrl ?? undefined,
    category: c.category ?? undefined,
    visibility: c.visibility,
    joinMode: c.joinMode,
    memberCount: c.memberCount,
    createdAt: c.createdAt.toISOString(),
  };
}

function serializeChannel(c: typeof schema.communityChannels.$inferSelect): CommunityChannel {
  return {
    id: c.id,
    communityId: c.communityId,
    name: c.name,
    description: c.description ?? undefined,
    position: c.position,
    isDefault: c.isDefault,
    type: c.type,
    writeMinRole: c.writeMinRole,
    slowModeSeconds: c.slowModeSeconds,
    createdAt: c.createdAt.toISOString(),
  };
}
