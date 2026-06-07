import { and, desc, eq, inArray, lt, ne } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { exploreQuerySchema, searchQuerySchema, type Post } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { buildInteractiveMaps } from '../services/enrichment-service.js';
import {
  getSuggestedUsers,
  getTrendingHashtags,
  searchAll,
} from '../services/search-service.js';
import { serializePost } from './posts.js';

export const searchRoutes: FastifyPluginAsync = async (app) => {
  // Birleşik arama — kullanıcı, hashtag, etkinlik (üniversite içi).
  app.get('/search', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz sorgu', details: parsed.error.issues },
      });
    }
    const { q, type, limit } = parsed.data;
    const results = await searchAll({ q, type, universityId: auth.university_id, limit });
    return reply.send(results);
  });

  /**
   * Keşfet — domain'e göre önerilen hesaplar + (sosyal) trend hashtag'ler + keşif postları.
   * Domain ayrımı korunur: career keşfetinde reklam/trend yok.
   */
  app.get('/explore', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = exploreQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz sorgu', details: parsed.error.issues },
      });
    }
    const { domain, cursor, limit } = parsed.data;
    const cursorMs = cursor ? Number(cursor) : null;

    // Keşif postları: üniversite içi, herkese açık, ilgili domain, kendi postları hariç.
    const rows = await db
      .select({ post: schema.posts, author: authorColumns() })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
      .where(
        and(
          eq(schema.posts.universityId, auth.university_id),
          eq(schema.posts.contentDomain, domain),
          eq(schema.posts.visibility, 'public'),
          ne(schema.posts.authorId, auth.sub),
          cursorMs ? lt(schema.posts.createdAt, new Date(cursorMs)) : undefined,
        ),
      )
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit);

    const posts = rows.map((r) => r.post);
    const authorById = new Map(rows.map((r) => [r.post.id, r.author]));

    const likedSet = new Set<string>();
    if (posts.length) {
      const liked = await db
        .select({ postId: schema.likes.postId })
        .from(schema.likes)
        .where(
          and(
            eq(schema.likes.userId, auth.sub),
            inArray(
              schema.likes.postId,
              posts.map((p) => p.id),
            ),
          ),
        );
      for (const l of liked) likedSet.add(l.postId);
    }

    const { polls, events } = await buildInteractiveMaps(
      posts.map((p) => ({ id: p.id, type: p.type })),
      auth.sub,
    );

    const discoverPosts: Post[] = posts.map((post) => {
      const a = authorById.get(post.id);
      return {
        ...serializePost(post),
        author: a
          ? {
              id: a.id,
              username: a.username,
              displayName: a.displayName,
              avatarUrl: a.avatarUrl ?? undefined,
              isVerifiedStudent: a.isVerifiedStudent,
            }
          : undefined,
        likedByMe: likedSet.has(post.id),
        poll: polls.get(post.id),
        event: events.get(post.id),
      };
    });

    const suggestedUsers = await getSuggestedUsers({
      universityId: auth.university_id,
      userId: auth.sub,
      limit: 10,
    });

    const trending =
      domain === 'social' ? await getTrendingHashtags(auth.university_id, 10) : [];

    const last = posts[posts.length - 1];
    const nextCursor = last ? String(new Date(last.createdAt).getTime()) : null;

    return reply.send({ suggestedUsers, trending, posts: discoverPosts, nextCursor });
  });
};

function authorColumns() {
  return {
    id: schema.users.id,
    username: schema.users.username,
    displayName: schema.users.displayName,
    avatarUrl: schema.users.avatarUrl,
    isVerifiedStudent: schema.users.isVerifiedStudent,
  };
}
