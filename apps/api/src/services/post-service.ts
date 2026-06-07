import { eq, sql } from 'drizzle-orm';
import type { ContentDomain, PostType, Visibility } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { enqueueFanout } from '../queue/index.js';

/**
 * Etkinlik/anket/kariyer içerikleri feed'de görünmek için bir post kaydına bağlanır.
 * Bu yardımcı: post oluşturur, sayaç günceller, fan-out kuyruğa atar.
 * content_domain çağrı yerine göre belirlenir (event/poll=social, career=career).
 */
export async function createLinkedPost(params: {
  universityId: string;
  authorId: string;
  type: PostType;
  contentDomain: ContentDomain;
  content?: string;
  mediaUrls?: string[];
  visibility?: Visibility;
}): Promise<typeof schema.posts.$inferSelect> {
  const [post] = await db
    .insert(schema.posts)
    .values({
      universityId: params.universityId,
      authorId: params.authorId,
      type: params.type,
      contentDomain: params.contentDomain,
      content: params.content,
      mediaUrls: params.mediaUrls ?? [],
      visibility: params.visibility ?? 'public',
    })
    .returning();
  if (!post) throw new Error('post_create_failed');

  await db
    .update(schema.users)
    .set({ postCount: sql`${schema.users.postCount} + 1` })
    .where(eq(schema.users.id, params.authorId));

  await enqueueFanout({
    postId: post.id,
    authorId: params.authorId,
    universityId: params.universityId,
    domain: params.contentDomain,
    createdAt: post.createdAt.getTime(),
  });

  return post;
}
