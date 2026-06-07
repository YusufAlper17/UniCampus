import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { redis, feedKey } from '../redis.js';
import type { ContentDomain } from '@unicampus/shared-types';

const TIMELINE_CAP = 1000;
const CELEBRITY_THRESHOLD = 10_000;

/**
 * Hibrit fan-out (Instagram modeli):
 *  - Normal hesap: yazarken takipçilerin Redis timeline'ına yaz (fan-out on write).
 *  - Celebrity (>10K takipçi): timeline'a yazma; okuma anında pull (fan-out on read).
 * Sosyal ve kariyer AYRI sorted set — sızıntı imkansız.
 */
export async function fanoutPost(params: {
  postId: string;
  authorId: string;
  domain: ContentDomain;
  createdAt: number;
}): Promise<void> {
  const { postId, authorId, domain, createdAt } = params;

  // Yazarın kendi timeline'ı her zaman güncellenir.
  await addToTimeline(domain, authorId, postId, createdAt);

  const [author] = await db
    .select({ followerCount: schema.users.followerCount })
    .from(schema.users)
    .where(eq(schema.users.id, authorId))
    .limit(1);

  if (author && author.followerCount >= CELEBRITY_THRESHOLD) {
    // Celebrity: fan-out yok, okuma anında çekilir.
    return;
  }

  const followers = await db
    .select({ followerId: schema.follows.followerId })
    .from(schema.follows)
    .where(and(eq(schema.follows.followingId, authorId), eq(schema.follows.status, 'active')));

  const pipeline = redis.pipeline();
  for (const f of followers) {
    const key = feedKey(domain, f.followerId);
    pipeline.zadd(key, createdAt, postId);
    pipeline.zremrangebyrank(key, 0, -(TIMELINE_CAP + 1));
  }
  await pipeline.exec();
}

async function addToTimeline(
  domain: ContentDomain,
  userId: string,
  postId: string,
  score: number,
): Promise<void> {
  const key = feedKey(domain, userId);
  await redis.zadd(key, score, postId);
  await redis.zremrangebyrank(key, 0, -(TIMELINE_CAP + 1));
}

/** Redis timeline'dan cursor'a göre post ID'leri. cursor = createdAt ms. */
export async function readTimelineIds(
  domain: ContentDomain,
  userId: string,
  cursor: number | null,
  limit: number,
): Promise<string[]> {
  const key = feedKey(domain, userId);
  const max = cursor != null ? `(${cursor}` : '+inf';
  const ids = await redis.zrevrangebyscore(key, max, '-inf', 'LIMIT', 0, limit);
  return ids;
}
