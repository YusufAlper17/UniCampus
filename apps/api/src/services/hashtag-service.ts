import { sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { enqueueIndex } from '../queue/index.js';

const HASHTAG_RE = /#([\p{L}\p{N}_]{2,50})/gu;

export function extractHashtags(content: string): string[] {
  const tags = new Set<string>();
  for (const m of content.matchAll(HASHTAG_RE)) {
    if (m[1]) tags.add(m[1].toLowerCase());
  }
  return [...tags].slice(0, 10);
}

// Hashtag'leri upsert eder, post ile ilişkilendirir, kullanım sayacını artırır.
export async function attachHashtags(
  postId: string,
  universityId: string,
  tags: string[],
): Promise<void> {
  for (const tag of tags) {
    const [row] = await db
      .insert(schema.hashtags)
      .values({ universityId, tag, usageCount: 1, lastUsedAt: new Date() })
      .onConflictDoUpdate({
        target: [schema.hashtags.universityId, schema.hashtags.tag],
        set: { usageCount: sql`${schema.hashtags.usageCount} + 1`, lastUsedAt: new Date() },
      })
      .returning({ id: schema.hashtags.id });
    if (row) {
      await db
        .insert(schema.postHashtags)
        .values({ postId, hashtagId: row.id })
        .onConflictDoNothing();
      await enqueueIndex({ kind: 'hashtag', id: row.id });
    }
  }
}
