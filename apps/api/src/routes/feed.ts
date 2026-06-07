import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { feedQuerySchema, type FeedItem, type Post } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { readTimelineIds } from '../services/feed-service.js';
import { buildInteractiveMaps } from '../services/enrichment-service.js';
import { getActiveAds, injectAds } from '../services/ad-service.js';

/**
 * Dual feed — sosyal/kariyer kesin ayrım.
 * ALTIN KURAL: content_domain filtresi her zaman uygulanır (DB + Redis key ayrı).
 * domain=social → reklam slotları enjekte edilebilir; domain=career → reklamsız.
 *
 * Okuma stratejisi: Redis timeline (sıcak) → boşsa DB fallback (soğuk başlatma).
 */
export const feedRoutes: FastifyPluginAsync = async (app) => {
  app.get('/feed', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz sorgu', details: parsed.error.issues },
      });
    }
    const { domain, cursor, limit } = parsed.data;
    const auth = requireAuth(req, reply);
    if (!auth) return;

    const cursorMs = cursor ? Number(cursor) : null;

    // 1) Redis timeline'dan post ID'leri (sıcak yol).
    const timelineIds = await readTimelineIds(domain, auth.sub, cursorMs, limit);

    let posts: (typeof schema.posts.$inferSelect)[];
    let authors: Map<string, AuthorRow>;

    if (timelineIds.length > 0) {
      const rows = await db
        .select({ post: schema.posts, author: authorColumns() })
        .from(schema.posts)
        .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
        .where(
          and(eq(schema.posts.contentDomain, domain), inArray(schema.posts.id, timelineIds)),
        );
      // Redis sırasını koru.
      const byId = new Map(rows.map((r) => [r.post.id, r]));
      posts = timelineIds.map((id) => byId.get(id)?.post).filter(Boolean) as typeof posts;
      authors = new Map(rows.map((r) => [r.post.id, r.author]));
    } else {
      // 2) DB fallback — üniversite içi son postlar (soğuk başlatma / yeni kullanıcı).
      const rows = await db
        .select({ post: schema.posts, author: authorColumns() })
        .from(schema.posts)
        .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
        .where(
          and(
            eq(schema.posts.universityId, auth.university_id),
            eq(schema.posts.contentDomain, domain), // ← sızıntı imkansız
            eq(schema.posts.isReel, false), // Reels normal akışta görünmez
            cursorMs ? lt(schema.posts.createdAt, new Date(cursorMs)) : undefined,
          ),
        )
        .orderBy(desc(schema.posts.createdAt))
        .limit(limit);
      posts = rows.map((r) => r.post);
      authors = new Map(rows.map((r) => [r.post.id, r.author]));
    }

    // likedByMe toplu sorgu.
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

    // Anket/etkinlik postlarına interaktif veri ekle (batch).
    const { polls, events } = await buildInteractiveMaps(
      posts.map((p) => ({ id: p.id, type: p.type })),
      auth.sub,
    );

    const items: FeedItem[] = posts.map((post) => {
      const a = authors.get(post.id);
      const full: Post = {
        ...toPost(post),
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
      return { type: 'post', post: full };
    });

    let responseItems: FeedItem[] = items;

    // Reklam yalnızca SOSYAL akışta — kariyer akışı reklamsız kalır.
    if (domain === 'social') {
      const ads = await getActiveAds(auth.university_id, { accountType: auth.type });
      responseItems = injectAds(items, ads) as FeedItem[];
    }

    const last = posts[posts.length - 1];
    const nextCursor = last ? String(new Date(last.createdAt).getTime()) : null;

    return reply.send({ items: responseItems, nextCursor });
  });
};

interface AuthorRow {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerifiedStudent: boolean;
}

function authorColumns() {
  return {
    id: schema.users.id,
    username: schema.users.username,
    displayName: schema.users.displayName,
    avatarUrl: schema.users.avatarUrl,
    isVerifiedStudent: schema.users.isVerifiedStudent,
  };
}

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
