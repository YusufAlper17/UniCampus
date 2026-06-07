import { and, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import {
  createConversationSchema,
  registerDeviceSchema,
  sendMessageSchema,
  setDisappearingSchema,
  type Conversation,
  type Message,
} from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { publishToUsers } from '../lib/realtime.js';
import { enqueuePush } from '../queue/index.js';

export const messagingRoutes: FastifyPluginAsync = async (app) => {
  // Sohbet oluştur (DM tekilleştirilir; grup için title zorunlu).
  app.post('/conversations', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;
    const others = input.memberIds.filter((id) => id !== auth.sub);

    if (input.type === 'dm') {
      const other = others[0];
      if (!other) {
        return reply.code(400).send({ error: { code: 'invalid', message: 'Geçersiz alıcı' } });
      }
      // Aynı üniversite kontrolü.
      const [peer] = await db
        .select({ id: schema.users.id, universityId: schema.users.universityId })
        .from(schema.users)
        .where(eq(schema.users.id, other))
        .limit(1);
      if (!peer || peer.universityId !== auth.university_id) {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
      }
      const dmKey = [auth.sub, other].sort().join(':');
      const [existing] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.dmKey, dmKey))
        .limit(1);
      if (existing) return reply.send({ conversation: await serializeConversation(existing, auth.sub) });

      const [conv] = await db
        .insert(schema.conversations)
        .values({ type: 'dm', universityId: auth.university_id, createdBy: auth.sub, dmKey })
        .returning();
      if (!conv) {
        return reply.code(500).send({ error: { code: 'server_error', message: 'Oluşturulamadı' } });
      }
      await db.insert(schema.conversationMembers).values([
        { conversationId: conv.id, userId: auth.sub, role: 'admin' },
        { conversationId: conv.id, userId: other, role: 'member' },
      ]);
      return reply.code(201).send({ conversation: await serializeConversation(conv, auth.sub) });
    }

    // Grup
    if (!input.title) {
      return reply.code(400).send({ error: { code: 'title_required', message: 'Grup adı gerekli' } });
    }
    const [conv] = await db
      .insert(schema.conversations)
      .values({ type: 'group', title: input.title, universityId: auth.university_id, createdBy: auth.sub })
      .returning();
    if (!conv) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Oluşturulamadı' } });
    }
    const memberRows = [
      { conversationId: conv.id, userId: auth.sub, role: 'admin' as const },
      ...others.map((id) => ({ conversationId: conv.id, userId: id, role: 'member' as const })),
    ];
    await db.insert(schema.conversationMembers).values(memberRows).onConflictDoNothing();
    return reply.code(201).send({ conversation: await serializeConversation(conv, auth.sub) });
  });

  // Sohbet listesi — son mesaj + okunmamış sayısı.
  app.get('/conversations', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;

    const memberships = await db
      .select({ conversationId: schema.conversationMembers.conversationId })
      .from(schema.conversationMembers)
      .where(eq(schema.conversationMembers.userId, auth.sub));
    const convIds = memberships.map((m) => m.conversationId);
    if (!convIds.length) return reply.send({ items: [] });

    const convs = await db
      .select()
      .from(schema.conversations)
      .where(inArray(schema.conversations.id, convIds))
      .orderBy(desc(schema.conversations.lastMessageAt));

    const items = await Promise.all(convs.map((c) => serializeConversation(c, auth.sub)));
    // lastMessageAt null olanları sona koy (yeni oluşturulmuş boş sohbet).
    items.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
    return reply.send({ items });
  });

  // Mesajlar — cursor (createdAt ms) ile geriye sayfalama.
  app.get('/conversations/:id/messages', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    if (!(await isMember(id, auth.sub))) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Üye değilsin' } });
    }
    const { cursor, limit: rawLimit } = req.query as { cursor?: string; limit?: string };
    const limit = Math.min(Number(rawLimit) || 30, 50);
    const cursorMs = cursor ? Number(cursor) : null;

    const rows = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, id),
          // Süresi dolan (disappearing) mesajlar gizlenir.
          or(isNull(schema.messages.expiresAt), gt(schema.messages.expiresAt, new Date())),
          cursorMs ? lt(schema.messages.createdAt, new Date(cursorMs)) : undefined,
        ),
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);

    // Okundu bilgisi: diğer üyelerin en eski okuma zamanı (hepsi okuduysa tik mavi).
    const otherMembers = await db
      .select({ lastReadAt: schema.conversationMembers.lastReadAt })
      .from(schema.conversationMembers)
      .where(
        and(
          eq(schema.conversationMembers.conversationId, id),
          ne(schema.conversationMembers.userId, auth.sub),
        ),
      );
    let peerReadMs: number | null = null;
    if (otherMembers.length) {
      const times = otherMembers.map((m) => m.lastReadAt?.getTime() ?? 0);
      peerReadMs = Math.min(...times);
    }

    const last = rows[rows.length - 1];
    const nextCursor = rows.length === limit && last ? String(last.createdAt.getTime()) : null;
    // Kronolojik (eski→yeni) döndür; istemci alta ekler.
    const items = rows.reverse().map((m) => serializeMessage(m, auth.sub, peerReadMs));
    return reply.send({ items, nextCursor });
  });

  // Mesaj gönder.
  app.post('/conversations/:id/messages', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    if (!(await isMember(id, auth.sub))) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Üye değilsin' } });
    }
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;
    // Disappearing timer aktifse mesaja süre damgası bas.
    const [conv] = await db
      .select({ disappearingSeconds: schema.conversations.disappearingSeconds })
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .limit(1);
    const expiresAt =
      conv?.disappearingSeconds && conv.disappearingSeconds > 0
        ? new Date(Date.now() + conv.disappearingSeconds * 1000)
        : null;
    const [msg] = await db
      .insert(schema.messages)
      .values({
        conversationId: id,
        senderId: auth.sub,
        content: input.content?.trim() || null,
        mediaUrl: input.mediaUrl,
        replyToId: input.replyToId,
        viewOnce: input.viewOnce,
        expiresAt,
      })
      .returning();
    if (!msg) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Gönderilemedi' } });
    }

    const preview = input.content?.trim().slice(0, 120) ?? '📎 Medya';
    await db
      .update(schema.conversations)
      .set({ lastMessageAt: msg.createdAt, lastMessagePreview: preview })
      .where(eq(schema.conversations.id, id));

    // Diğer üyelere realtime + push.
    const members = await db
      .select({ userId: schema.conversationMembers.userId })
      .from(schema.conversationMembers)
      .where(eq(schema.conversationMembers.conversationId, id));
    const recipientIds = members.map((m) => m.userId).filter((uid) => uid !== auth.sub);

    await publishToUsers(
      members.map((m) => m.userId),
      { kind: 'message', conversationId: id, message: serializeMessage(msg, '') },
    );
    await enqueuePush({
      userIds: recipientIds,
      title: 'Yeni mesaj',
      body: preview,
      data: { conversationId: id },
    });

    return reply.code(201).send({ message: serializeMessage(msg, auth.sub) });
  });

  // Okundu işaretle.
  app.post('/conversations/:id/read', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const now = new Date();
    const updated = await db
      .update(schema.conversationMembers)
      .set({ lastReadAt: now })
      .where(
        and(
          eq(schema.conversationMembers.conversationId, id),
          eq(schema.conversationMembers.userId, auth.sub),
        ),
      )
      .returning({ userId: schema.conversationMembers.userId });
    if (!updated.length) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Üye değilsin' } });
    }
    // Karşı tarafa okundu bilgisi (çift mavi tik).
    const others = await db
      .select({ userId: schema.conversationMembers.userId })
      .from(schema.conversationMembers)
      .where(
        and(
          eq(schema.conversationMembers.conversationId, id),
          ne(schema.conversationMembers.userId, auth.sub),
        ),
      );
    await publishToUsers(
      others.map((o) => o.userId),
      { kind: 'read', conversationId: id, userId: auth.sub, readAt: now.toISOString() },
    );
    return reply.send({ readAt: now.toISOString() });
  });

  // Disappearing timer ayarla (Faz 11). seconds=0 → kapat.
  app.post('/conversations/:id/disappearing', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    if (!(await isMember(id, auth.sub))) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Üye değilsin' } });
    }
    const parsed = setDisappearingSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const seconds = parsed.data.seconds > 0 ? parsed.data.seconds : null;
    await db
      .update(schema.conversations)
      .set({ disappearingSeconds: seconds })
      .where(eq(schema.conversations.id, id));
    return reply.send({ disappearingSeconds: seconds ?? 0 });
  });

  // View-once medyayı görüntüle (Faz 11) — bir kez; sonra içerik gizlenir.
  app.post('/messages/:id/view', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [msg] = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.id, id))
      .limit(1);
    if (!msg || !(await isMember(msg.conversationId, auth.sub))) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Mesaj yok' } });
    }
    if (!msg.viewOnce) {
      return reply.code(400).send({ error: { code: 'not_view_once', message: 'Tek görüntülemelik değil' } });
    }
    if (msg.senderId === auth.sub) {
      return reply.code(400).send({ error: { code: 'own_message', message: 'Kendi mesajın' } });
    }
    if (msg.viewedAt) {
      return reply.code(410).send({ error: { code: 'already_viewed', message: 'Zaten görüntülendi' } });
    }
    await db
      .update(schema.messages)
      .set({ viewedAt: new Date() })
      .where(eq(schema.messages.id, id));
    return reply.send({ mediaUrl: msg.mediaUrl, content: msg.content ?? undefined });
  });

  // Push cihaz token kaydı.
  app.post('/devices', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = registerDeviceSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    await db
      .insert(schema.devices)
      .values({ userId: auth.sub, pushToken: parsed.data.pushToken, platform: parsed.data.platform })
      .onConflictDoUpdate({
        target: schema.devices.pushToken,
        set: { userId: auth.sub, platform: parsed.data.platform },
      });
    return reply.code(201).send({ success: true });
  });
};

async function isMember(conversationId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: schema.conversationMembers.userId })
    .from(schema.conversationMembers)
    .where(
      and(
        eq(schema.conversationMembers.conversationId, conversationId),
        eq(schema.conversationMembers.userId, userId),
      ),
    )
    .limit(1);
  return !!row;
}

function serializeMessage(
  m: typeof schema.messages.$inferSelect,
  viewerId: string,
  peerReadMs?: number | null,
): Message {
  const mine = viewerId ? m.senderId === viewerId : undefined;
  // View-once: alıcı medyayı listede göremez; yalnızca /view ile bir kez açar.
  const hideViewOnce = m.viewOnce && mine === false;
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: hideViewOnce ? undefined : m.content ?? undefined,
    mediaUrl: hideViewOnce ? undefined : m.mediaUrl ?? undefined,
    replyToId: m.replyToId ?? undefined,
    editedAt: m.editedAt?.toISOString(),
    expiresAt: m.expiresAt?.toISOString(),
    viewOnce: m.viewOnce || undefined,
    viewed: m.viewedAt ? true : undefined,
    createdAt: m.createdAt.toISOString(),
    mine,
    readByPeer:
      mine && peerReadMs != null ? peerReadMs >= m.createdAt.getTime() : undefined,
  };
}

async function serializeConversation(
  c: typeof schema.conversations.$inferSelect,
  viewerId: string,
): Promise<Conversation> {
  const [myMember] = await db
    .select({ lastReadAt: schema.conversationMembers.lastReadAt })
    .from(schema.conversationMembers)
    .where(
      and(
        eq(schema.conversationMembers.conversationId, c.id),
        eq(schema.conversationMembers.userId, viewerId),
      ),
    )
    .limit(1);

  const memberCountRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.conversationMembers)
    .where(eq(schema.conversationMembers.conversationId, c.id));
  const memberCount = memberCountRows[0]?.count ?? 0;

  const unreadRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.conversationId, c.id),
        ne(schema.messages.senderId, viewerId),
        myMember?.lastReadAt ? gt(schema.messages.createdAt, myMember.lastReadAt) : undefined,
      ),
    );
  const unreadCount = unreadRows[0]?.count ?? 0;

  let peer: Conversation['peer'];
  if (c.type === 'dm') {
    const [other] = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        isVerifiedStudent: schema.users.isVerifiedStudent,
      })
      .from(schema.conversationMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.conversationMembers.userId))
      .where(
        and(
          eq(schema.conversationMembers.conversationId, c.id),
          ne(schema.conversationMembers.userId, viewerId),
        ),
      )
      .limit(1);
    if (other) {
      peer = {
        id: other.id,
        username: other.username,
        displayName: other.displayName,
        avatarUrl: other.avatarUrl ?? undefined,
        isVerifiedStudent: other.isVerifiedStudent,
      };
    }
  }

  return {
    id: c.id,
    type: c.type,
    title: c.title ?? undefined,
    avatarUrl: c.avatarUrl ?? undefined,
    peer,
    lastMessagePreview: c.lastMessagePreview ?? undefined,
    lastMessageAt: c.lastMessageAt?.toISOString(),
    unreadCount: unreadCount ?? 0,
    memberCount: memberCount ?? 0,
    disappearingSeconds: c.disappearingSeconds ?? undefined,
    createdAt: c.createdAt.toISOString(),
  };
}
