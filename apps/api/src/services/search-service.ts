import { and, desc, eq, ilike, ne, notInArray, or, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { SEARCH_INDEXES, getIndex, isSearchEnabled } from '../lib/search.js';

export interface UserHit {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  careerHeadline?: string;
  isVerifiedStudent: boolean;
  type: string;
}
export interface HashtagHit {
  tag: string;
  usageCount: number;
}
export interface EventHit {
  id: string;
  title: string;
  startsAt: string;
  postId?: string;
}

type SearchType = 'all' | 'user' | 'hashtag' | 'event';

// ---- Indexleme (best-effort; Meili kapalıysa no-op) ----

export async function indexUser(u: typeof schema.users.$inferSelect): Promise<void> {
  const index = getIndex(SEARCH_INDEXES.users);
  if (!index) return;
  try {
    await index.addDocuments([
      {
        id: u.id,
        universityId: u.universityId,
        username: u.username,
        displayName: u.displayName,
        bio: u.bio ?? '',
        careerHeadline: u.careerHeadline ?? '',
        avatarUrl: u.avatarUrl ?? null,
        isVerifiedStudent: u.isVerifiedStudent,
        type: u.type,
      },
    ]);
  } catch {
    /* arama kritik yol değil */
  }
}

export async function indexEvent(e: typeof schema.events.$inferSelect): Promise<void> {
  const index = getIndex(SEARCH_INDEXES.events);
  if (!index) return;
  try {
    await index.addDocuments([
      {
        id: e.id,
        universityId: e.universityId,
        title: e.title,
        description: e.description ?? '',
        locationText: e.locationText ?? '',
        startsAt: e.startsAt.getTime(),
        postId: e.postId ?? null,
        domain: 'social',
      },
    ]);
  } catch {
    /* yoksay */
  }
}

export async function indexHashtag(h: typeof schema.hashtags.$inferSelect): Promise<void> {
  const index = getIndex(SEARCH_INDEXES.hashtags);
  if (!index) return;
  try {
    await index.addDocuments([
      {
        id: h.id,
        universityId: h.universityId,
        tag: h.tag,
        usageCount: h.usageCount,
        domain: 'social',
      },
    ]);
  } catch {
    /* yoksay */
  }
}

// ---- Arama ----

export async function searchAll(params: {
  q: string;
  type: SearchType;
  universityId: string;
  limit: number;
}): Promise<{ users: UserHit[]; hashtags: HashtagHit[]; events: EventHit[] }> {
  const { q, type, universityId, limit } = params;
  const want = (t: SearchType) => type === 'all' || type === t;

  const result: { users: UserHit[]; hashtags: HashtagHit[]; events: EventHit[] } = {
    users: [],
    hashtags: [],
    events: [],
  };
  if (!q.trim()) return result;

  if (isSearchEnabled()) {
    const filter = `universityId = "${universityId}"`;
    if (want('user')) {
      const res = await getIndex(SEARCH_INDEXES.users)!.search(q, { filter, limit });
      result.users = (res.hits as Record<string, unknown>[]).map((h) => ({
        id: String(h.id),
        username: String(h.username),
        displayName: String(h.displayName),
        avatarUrl: (h.avatarUrl as string) ?? undefined,
        careerHeadline: (h.careerHeadline as string) || undefined,
        isVerifiedStudent: Boolean(h.isVerifiedStudent),
        type: String(h.type),
      }));
    }
    if (want('hashtag')) {
      const res = await getIndex(SEARCH_INDEXES.hashtags)!.search(q, { filter, limit });
      result.hashtags = (res.hits as Record<string, unknown>[]).map((h) => ({
        tag: String(h.tag),
        usageCount: Number(h.usageCount),
      }));
    }
    if (want('event')) {
      const res = await getIndex(SEARCH_INDEXES.events)!.search(q, { filter, limit });
      result.events = (res.hits as Record<string, unknown>[]).map((h) => ({
        id: String(h.id),
        title: String(h.title),
        startsAt: new Date(Number(h.startsAt)).toISOString(),
        postId: (h.postId as string) ?? undefined,
      }));
    }
    return result;
  }

  // Postgres fallback (ILIKE). LIKE joker karakterleri kaçırılır (backslash = varsayılan escape).
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  if (want('user')) {
    const rows = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        careerHeadline: schema.users.careerHeadline,
        isVerifiedStudent: schema.users.isVerifiedStudent,
        type: schema.users.type,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.universityId, universityId),
          eq(schema.users.status, 'active'),
          or(ilike(schema.users.username, like), ilike(schema.users.displayName, like)),
        ),
      )
      .limit(limit);
    result.users = rows.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl ?? undefined,
      careerHeadline: r.careerHeadline ?? undefined,
      isVerifiedStudent: r.isVerifiedStudent,
      type: r.type,
    }));
  }
  if (want('hashtag')) {
    const rows = await db
      .select({ tag: schema.hashtags.tag, usageCount: schema.hashtags.usageCount })
      .from(schema.hashtags)
      .where(and(eq(schema.hashtags.universityId, universityId), ilike(schema.hashtags.tag, like)))
      .orderBy(desc(schema.hashtags.usageCount))
      .limit(limit);
    result.hashtags = rows;
  }
  if (want('event')) {
    const rows = await db
      .select({
        id: schema.events.id,
        title: schema.events.title,
        startsAt: schema.events.startsAt,
        postId: schema.events.postId,
      })
      .from(schema.events)
      .where(and(eq(schema.events.universityId, universityId), ilike(schema.events.title, like)))
      .orderBy(desc(schema.events.startsAt))
      .limit(limit);
    result.events = rows.map((r) => ({
      id: r.id,
      title: r.title,
      startsAt: r.startsAt.toISOString(),
      postId: r.postId ?? undefined,
    }));
  }
  return result;
}

// ---- Keşfet ----

export async function getSuggestedUsers(params: {
  universityId: string;
  userId: string;
  limit: number;
}): Promise<UserHit[]> {
  const { universityId, userId, limit } = params;
  const following = await db
    .select({ id: schema.follows.followingId })
    .from(schema.follows)
    .where(eq(schema.follows.followerId, userId));
  const excludeIds = [userId, ...following.map((f) => f.id)];

  const rows = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      careerHeadline: schema.users.careerHeadline,
      isVerifiedStudent: schema.users.isVerifiedStudent,
      type: schema.users.type,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.universityId, universityId),
        eq(schema.users.status, 'active'),
        eq(schema.users.accountVisibility, 'public'),
        excludeIds.length ? notInArray(schema.users.id, excludeIds) : ne(schema.users.id, userId),
      ),
    )
    .orderBy(desc(schema.users.followerCount))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl ?? undefined,
    careerHeadline: r.careerHeadline ?? undefined,
    isVerifiedStudent: r.isVerifiedStudent,
    type: r.type,
  }));
}

export async function getTrendingHashtags(universityId: string, limit: number): Promise<HashtagHit[]> {
  return db
    .select({ tag: schema.hashtags.tag, usageCount: schema.hashtags.usageCount })
    .from(schema.hashtags)
    .where(and(eq(schema.hashtags.universityId, universityId), sql`${schema.hashtags.usageCount} > 0`))
    .orderBy(desc(schema.hashtags.usageCount))
    .limit(limit);
}
