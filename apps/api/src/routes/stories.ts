import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { createStorySchema, type Story, type StoryGroup } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Story (Faz 11) — 24 saatlik geçici paylaşım.
 * Görünürlük: public → takipçiler; close_friends → yakın arkadaş listesi.
 * Üniversite izolasyonu korunur; süresi dolan story'ler sorgularda filtrelenir.
 */
export const storyRoutes: FastifyPluginAsync = async (app) => {
  // Story oluştur.
  app.post('/stories', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createStorySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const [story] = await db
      .insert(schema.stories)
      .values({
        universityId: auth.university_id,
        authorId: auth.sub,
        mediaUrl: parsed.data.mediaUrl,
        caption: parsed.data.caption,
        audience: parsed.data.audience,
        expiresAt: new Date(Date.now() + STORY_TTL_MS),
      })
      .returning();
    return reply.code(201).send({ story: story ? serializeStory(story, true) : null });
  });

  // Story akışı — takip edilenlerin + kendi aktif story'leri, yazara göre gruplu.
  app.get('/stories', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;

    const following = await db
      .select({ id: schema.follows.followingId })
      .from(schema.follows)
      .where(and(eq(schema.follows.followerId, auth.sub), eq(schema.follows.status, 'active')));
    const authorIds = [...new Set([auth.sub, ...following.map((f) => f.id)])];

    const rows = await db
      .select()
      .from(schema.stories)
      .where(
        and(
          inArray(schema.stories.authorId, authorIds),
          gt(schema.stories.expiresAt, new Date()),
        ),
      )
      .orderBy(schema.stories.createdAt);

    if (!rows.length) return reply.send({ items: [] });

    // Yakın arkadaş kısıtı: close_friends story'lerini yalnızca listede olanlar görür.
    const closeFriendAuthors = rows
      .filter((s) => s.audience === 'close_friends' && s.authorId !== auth.sub)
      .map((s) => s.authorId);
    const allowedCloseFriend = new Set<string>();
    if (closeFriendAuthors.length) {
      const cf = await db
        .select({ userId: schema.closeFriends.userId })
        .from(schema.closeFriends)
        .where(
          and(
            inArray(schema.closeFriends.userId, closeFriendAuthors),
            eq(schema.closeFriends.friendId, auth.sub),
          ),
        );
      for (const row of cf) allowedCloseFriend.add(row.userId);
    }

    const visible = rows.filter(
      (s) =>
        s.authorId === auth.sub ||
        s.audience === 'public' ||
        allowedCloseFriend.has(s.authorId),
    );
    if (!visible.length) return reply.send({ items: [] });

    // İzlenenleri işaretle.
    const seen = await db
      .select({ storyId: schema.storyViews.storyId })
      .from(schema.storyViews)
      .where(
        and(
          eq(schema.storyViews.viewerId, auth.sub),
          inArray(
            schema.storyViews.storyId,
            visible.map((s) => s.id),
          ),
        ),
      );
    const seenSet = new Set(seen.map((s) => s.storyId));

    const authors = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        isVerifiedStudent: schema.users.isVerifiedStudent,
      })
      .from(schema.users)
      .where(inArray(schema.users.id, [...new Set(visible.map((s) => s.authorId))]));
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    const groups = new Map<string, StoryGroup>();
    for (const s of visible) {
      const a = authorMap.get(s.authorId);
      if (!a) continue;
      let group = groups.get(s.authorId);
      if (!group) {
        group = {
          author: {
            id: a.id,
            username: a.username,
            displayName: a.displayName,
            avatarUrl: a.avatarUrl ?? undefined,
            isVerifiedStudent: a.isVerifiedStudent,
          },
          stories: [],
          hasUnseen: false,
          isMine: s.authorId === auth.sub,
        };
        groups.set(s.authorId, group);
      }
      const isSeen = seenSet.has(s.id);
      group.stories.push(serializeStory(s, s.authorId === auth.sub, isSeen));
      if (!isSeen && s.authorId !== auth.sub) group.hasUnseen = true;
    }

    // Sıralama: önce kendi story'm, sonra görülmemişi olanlar, sonra en yeni.
    const items = [...groups.values()].sort((x, y) => {
      if (x.isMine) return -1;
      if (y.isMine) return 1;
      if (x.hasUnseen !== y.hasUnseen) return x.hasUnseen ? -1 : 1;
      return 0;
    });

    return reply.send({ items });
  });

  // Belirli kullanıcının aktif story'leri.
  app.get('/stories/user/:userId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { userId } = req.params as { userId: string };

    const rows = await db
      .select()
      .from(schema.stories)
      .where(and(eq(schema.stories.authorId, userId), gt(schema.stories.expiresAt, new Date())))
      .orderBy(schema.stories.createdAt);

    const isSelf = userId === auth.sub;
    let allowCloseFriends = isSelf;
    if (!isSelf) {
      const [cf] = await db
        .select({ userId: schema.closeFriends.userId })
        .from(schema.closeFriends)
        .where(and(eq(schema.closeFriends.userId, userId), eq(schema.closeFriends.friendId, auth.sub)))
        .limit(1);
      allowCloseFriends = !!cf;
    }
    const visible = rows.filter((s) => isSelf || s.audience === 'public' || allowCloseFriends);
    return reply.send({ items: visible.map((s) => serializeStory(s, isSelf)) });
  });

  // Story izlendi.
  app.post('/stories/:id/view', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const inserted = await db
      .insert(schema.storyViews)
      .values({ storyId: id, viewerId: auth.sub })
      .onConflictDoNothing()
      .returning({ storyId: schema.storyViews.storyId });
    if (inserted.length) {
      await db
        .update(schema.stories)
        .set({ viewCount: sql`${schema.stories.viewCount} + 1` })
        .where(eq(schema.stories.id, id));
    }
    return reply.send({ seen: true });
  });

  // Story sil (yalnızca sahibi).
  app.delete('/stories/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const deleted = await db
      .delete(schema.stories)
      .where(and(eq(schema.stories.id, id), eq(schema.stories.authorId, auth.sub)))
      .returning({ id: schema.stories.id });
    if (!deleted.length) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Story bulunamadı' } });
    }
    return reply.send({ success: true });
  });

  // ---- Yakın Arkadaşlar (Close Friends) ----
  app.get('/close-friends', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const rows = await db
      .select({
        userId: schema.closeFriends.friendId,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.closeFriends)
      .innerJoin(schema.users, eq(schema.users.id, schema.closeFriends.friendId))
      .where(eq(schema.closeFriends.userId, auth.sub))
      .orderBy(desc(schema.closeFriends.createdAt));
    return reply.send({
      items: rows.map((r) => ({
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl ?? undefined,
      })),
    });
  });

  app.post('/close-friends/:userId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { userId } = req.params as { userId: string };
    if (userId === auth.sub) {
      return reply.code(400).send({ error: { code: 'self_action', message: 'Kendini ekleyemezsin' } });
    }
    const [target] = await db
      .select({ id: schema.users.id, universityId: schema.users.universityId })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!target || target.universityId !== auth.university_id) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    }
    await db
      .insert(schema.closeFriends)
      .values({ userId: auth.sub, friendId: userId })
      .onConflictDoNothing();
    return reply.code(201).send({ added: true });
  });

  app.delete('/close-friends/:userId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { userId } = req.params as { userId: string };
    await db
      .delete(schema.closeFriends)
      .where(
        and(eq(schema.closeFriends.userId, auth.sub), eq(schema.closeFriends.friendId, userId)),
      );
    return reply.send({ removed: true });
  });
};

function serializeStory(
  s: typeof schema.stories.$inferSelect,
  includeViewCount: boolean,
  seen?: boolean,
): Story {
  return {
    id: s.id,
    authorId: s.authorId,
    mediaUrl: s.mediaUrl,
    caption: s.caption ?? undefined,
    audience: s.audience,
    expiresAt: s.expiresAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    seen,
    viewCount: includeViewCount ? s.viewCount : undefined,
  };
}
