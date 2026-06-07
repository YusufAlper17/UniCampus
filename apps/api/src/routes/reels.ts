import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { createReelSchema, type Post } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';

/**
 * Reels (Faz 12 — V2 lite) — kısa video.
 * Sosyal evrene ait (content_domain=social) ama normal akıştan ayrı tutulur
 * (posts.is_reel=true). Beğeni/yorum normal post endpoint'leriyle çalışır.
 */
export const reelRoutes: FastifyPluginAsync = async (app) => {
  app.post('/reels', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createReelSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const [post] = await db
      .insert(schema.posts)
      .values({
        universityId: auth.university_id,
        authorId: auth.sub,
        type: 'post',
        contentDomain: 'social',
        isReel: true,
        content: parsed.data.caption,
        mediaUrls: [parsed.data.mediaUrl],
        visibility: 'public',
      })
      .returning();
    if (!post) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Oluşturulamadı' } });
    }
    await db
      .update(schema.users)
      .set({ postCount: sql`${schema.users.postCount} + 1` })
      .where(eq(schema.users.id, auth.sub));
    return reply.code(201).send({ reel: toPost(post) });
  });

  // Reels akışı — üniversite içi en yeni reels (cursor = createdAt ms).
  app.get('/reels', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { cursor, limit: rawLimit } = req.query as { cursor?: string; limit?: string };
    const limit = Math.min(Number(rawLimit) || 10, 30);
    const cursorMs = cursor ? Number(cursor) : null;

    const rows = await db
      .select({
        post: schema.posts,
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        isVerifiedStudent: schema.users.isVerifiedStudent,
      })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
      .where(
        and(
          eq(schema.posts.universityId, auth.university_id),
          eq(schema.posts.isReel, true),
          cursorMs ? lt(schema.posts.createdAt, new Date(cursorMs)) : undefined,
        ),
      )
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit);

    const likedSet = new Set<string>();
    if (rows.length) {
      const liked = await db
        .select({ postId: schema.likes.postId })
        .from(schema.likes)
        .where(
          and(
            eq(schema.likes.userId, auth.sub),
            inArray(
              schema.likes.postId,
              rows.map((r) => r.post.id),
            ),
          ),
        );
      for (const l of liked) likedSet.add(l.postId);
    }

    const items = rows.map((r) => ({
      ...toPost(r.post),
      author: {
        id: r.id,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl ?? undefined,
        isVerifiedStudent: r.isVerifiedStudent,
      },
      likedByMe: likedSet.has(r.post.id),
    }));
    const last = rows[rows.length - 1];
    const nextCursor = rows.length === limit && last ? String(last.post.createdAt.getTime()) : null;
    return reply.send({ items, nextCursor });
  });
};

function toPost(post: typeof schema.posts.$inferSelect): Post {
  return {
    id: post.id,
    universityId: post.universityId,
    authorId: post.authorId,
    type: post.type,
    contentDomain: post.contentDomain,
    content: post.content ?? undefined,
    mediaUrls: post.mediaUrls ?? [],
    visibility: post.visibility,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    createdAt: post.createdAt.toISOString(),
  };
}
