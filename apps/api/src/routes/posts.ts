import crypto from 'node:crypto';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import {
  createCommentSchema,
  createPostSchema,
  presignSchema,
  type Comment,
} from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { enqueueFanout } from '../queue/index.js';
import { attachHashtags, extractHashtags } from '../services/hashtag-service.js';
import { buildInteractiveMaps } from '../services/enrichment-service.js';

export const postRoutes: FastifyPluginAsync = async (app) => {
  // Post oluştur — content_domain zorunlu; hashtag yalnızca sosyal.
  app.post('/posts', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;
    if (!input.content && input.mediaUrls.length === 0) {
      return reply
        .code(422)
        .send({ error: { code: 'empty_post', message: 'İçerik veya medya gerekli' } });
    }

    const [post] = await db
      .insert(schema.posts)
      .values({
        universityId: auth.university_id,
        authorId: auth.sub,
        type: input.type,
        contentDomain: input.contentDomain,
        content: input.content,
        mediaUrls: input.mediaUrls,
        visibility: input.visibility,
      })
      .returning();
    if (!post) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Oluşturulamadı' } });
    }

    await db
      .update(schema.users)
      .set({ postCount: sql`${schema.users.postCount} + 1` })
      .where(eq(schema.users.id, auth.sub));

    // Hashtag + trending yalnızca sosyal evrende.
    if (input.contentDomain === 'social' && input.content) {
      const tags = extractHashtags(input.content);
      if (tags.length) await attachHashtags(post.id, auth.university_id, tags);
    }

    await enqueueFanout({
      postId: post.id,
      authorId: auth.sub,
      universityId: auth.university_id,
      domain: input.contentDomain,
      createdAt: post.createdAt.getTime(),
    });

    return reply.code(201).send({ post: serializePost(post) });
  });

  // Tek post detay (yazar + likedByMe).
  app.get('/posts/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };

    const [row] = await db
      .select({ post: schema.posts, author: authorColumns() })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
      .where(eq(schema.posts.id, id))
      .limit(1);
    if (!row || row.post.universityId !== auth.university_id) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Gönderi yok' } });
    }

    const [liked] = await db
      .select({ postId: schema.likes.postId })
      .from(schema.likes)
      .where(and(eq(schema.likes.postId, id), eq(schema.likes.userId, auth.sub)))
      .limit(1);

    const { polls, events } = await buildInteractiveMaps(
      [{ id: row.post.id, type: row.post.type }],
      auth.sub,
    );

    return reply.send({
      post: {
        ...serializePost(row.post),
        author: { ...row.author, avatarUrl: row.author.avatarUrl ?? undefined },
        likedByMe: !!liked,
        poll: polls.get(row.post.id),
        event: events.get(row.post.id),
      },
    });
  });

  // Post sil (yalnızca yazar).
  app.delete('/posts/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const deleted = await db
      .delete(schema.posts)
      .where(and(eq(schema.posts.id, id), eq(schema.posts.authorId, auth.sub)))
      .returning({ id: schema.posts.id });
    if (!deleted.length) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Gönderi yok' } });
    }
    await db
      .update(schema.users)
      .set({ postCount: sql`greatest(${schema.users.postCount} - 1, 0)` })
      .where(eq(schema.users.id, auth.sub));
    return reply.send({ success: true });
  });

  // Beğen (optimistic counter).
  app.post('/posts/:id/like', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const inserted = await db
      .insert(schema.likes)
      .values({ postId: id, userId: auth.sub })
      .onConflictDoNothing()
      .returning({ postId: schema.likes.postId });
    if (inserted.length) {
      await db
        .update(schema.posts)
        .set({ likeCount: sql`${schema.posts.likeCount} + 1` })
        .where(eq(schema.posts.id, id));
    }
    return reply.send({ liked: true });
  });

  app.delete('/posts/:id/like', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const removed = await db
      .delete(schema.likes)
      .where(and(eq(schema.likes.postId, id), eq(schema.likes.userId, auth.sub)))
      .returning({ postId: schema.likes.postId });
    if (removed.length) {
      await db
        .update(schema.posts)
        .set({ likeCount: sql`greatest(${schema.posts.likeCount} - 1, 0)` })
        .where(eq(schema.posts.id, id));
    }
    return reply.send({ liked: false });
  });

  // Yorumlar (cursor pagination).
  app.get('/posts/:id/comments', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const limit = Math.min(Number((req.query as { limit?: string }).limit) || 20, 50);
    const cursorRaw = (req.query as { cursor?: string }).cursor;
    const cursor = cursorRaw ? new Date(Number(cursorRaw)) : null;

    const rows = await db
      .select({ comment: schema.comments, author: authorColumns() })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
      .where(
        and(
          eq(schema.comments.postId, id),
          cursor ? lt(schema.comments.createdAt, cursor) : undefined,
        ),
      )
      .orderBy(desc(schema.comments.createdAt))
      .limit(limit);

    const items: Comment[] = rows.map((r) => ({
      id: r.comment.id,
      postId: r.comment.postId,
      authorId: r.comment.authorId,
      author: { ...r.author, avatarUrl: r.author.avatarUrl ?? undefined },
      parentId: r.comment.parentId ?? undefined,
      content: r.comment.content,
      likeCount: r.comment.likeCount,
      createdAt: r.comment.createdAt.toISOString(),
    }));
    const last = rows[rows.length - 1];
    const nextCursor = last ? String(last.comment.createdAt.getTime()) : null;
    return reply.send({ items, nextCursor });
  });

  app.post('/posts/:id/comments', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const [comment] = await db
      .insert(schema.comments)
      .values({ postId: id, authorId: auth.sub, content: parsed.data.content, parentId: parsed.data.parentId })
      .returning();
    if (!comment) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Eklenemedi' } });
    }
    await db
      .update(schema.posts)
      .set({ commentCount: sql`${schema.posts.commentCount} + 1` })
      .where(eq(schema.posts.id, id));
    return reply.code(201).send({ comment: serializeComment(comment) });
  });

  // Bookmark.
  app.post('/posts/:id/bookmark', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    await db
      .insert(schema.bookmarks)
      .values({ postId: id, userId: auth.sub })
      .onConflictDoNothing();
    return reply.send({ bookmarked: true });
  });

  app.delete('/posts/:id/bookmark', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    await db
      .delete(schema.bookmarks)
      .where(and(eq(schema.bookmarks.postId, id), eq(schema.bookmarks.userId, auth.sub)));
    return reply.send({ bookmarked: false });
  });

  // Trending hashtag'ler (sosyal only).
  app.get('/trending', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const rows = await db
      .select({ tag: schema.hashtags.tag, usageCount: schema.hashtags.usageCount })
      .from(schema.hashtags)
      .where(eq(schema.hashtags.universityId, auth.university_id))
      .orderBy(desc(schema.hashtags.usageCount), desc(schema.hashtags.lastUsedAt))
      .limit(10);
    return reply.send({ items: rows });
  });

  // Bir hashtag'in postları (sosyal only).
  app.get('/hashtags/:tag/posts', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { tag } = req.params as { tag: string };

    const [hashtag] = await db
      .select({ id: schema.hashtags.id })
      .from(schema.hashtags)
      .where(
        and(
          eq(schema.hashtags.universityId, auth.university_id),
          eq(schema.hashtags.tag, tag.toLowerCase()),
        ),
      )
      .limit(1);
    if (!hashtag) return reply.send({ items: [] });

    const links = await db
      .select({ postId: schema.postHashtags.postId })
      .from(schema.postHashtags)
      .where(eq(schema.postHashtags.hashtagId, hashtag.id))
      .limit(50);
    const ids = links.map((l) => l.postId);
    if (!ids.length) return reply.send({ items: [] });

    const rows = await db
      .select({ post: schema.posts, author: authorColumns() })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
      .where(and(inArray(schema.posts.id, ids), eq(schema.posts.contentDomain, 'social')))
      .orderBy(desc(schema.posts.createdAt));

    return reply.send({
      items: rows.map((r) => ({ ...serializePost(r.post), author: r.author })),
    });
  });

  // Medya pre-signed upload (stub — Faz 8/altyapıda R2/S3 ile değiştirilecek).
  app.post('/media/presign', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = presignSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const key = `uploads/${auth.sub}/${crypto.randomUUID()}`;
    // TODO(altyapı): R2/S3 presigned PUT URL üret. Şimdilik placeholder.
    return reply.send({
      uploadUrl: `https://storage.example/${key}`,
      publicUrl: `https://cdn.example/${key}`,
      key,
    });
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

export function serializePost(post: typeof schema.posts.$inferSelect) {
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

function serializeComment(comment: typeof schema.comments.$inferSelect): Comment {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    parentId: comment.parentId ?? undefined,
    content: comment.content,
    likeCount: comment.likeCount,
    createdAt: comment.createdAt.toISOString(),
  };
}
