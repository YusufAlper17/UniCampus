import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { dealsKey, redis } from '../redis.js';

const CACHE_TTL = 300;

export interface DealRow {
  id: string;
  sponsorId: string;
  title: string;
  description: string | null;
  bannerUrl: string | null;
  category: string | null;
  discountValue: string | null;
  endsAt: Date | null;
  brandName?: string;
  logoUrl?: string | null;
}

function isActiveDeal(row: {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
}): boolean {
  if (row.status !== 'active') return false;
  const now = Date.now();
  if (row.startsAt && row.startsAt.getTime() > now) return false;
  if (row.endsAt && row.endsAt.getTime() < now) return false;
  if (row.usageLimit != null && row.usedCount >= row.usageLimit) return false;
  return true;
}

/** Üniversiteye uygun aktif kampanyalar (Redis cache 5 dk). */
export async function listActiveDeals(universityId: string, category?: string): Promise<DealRow[]> {
  const cacheKey = `${dealsKey(universityId)}${category ? `:${category}` : ''}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as DealRow[];

  const rows = await db
    .select({
      deal: schema.deals,
      brandName: schema.sponsors.brandName,
      logoUrl: schema.sponsors.logoUrl,
    })
    .from(schema.deals)
    .innerJoin(schema.sponsors, eq(schema.sponsors.id, schema.deals.sponsorId))
    .where(
      and(
        eq(schema.deals.status, 'active'),
        or(
          sql`cardinality(${schema.deals.targetUniversities}) = 0`,
          sql`${universityId}::uuid = ANY(${schema.deals.targetUniversities})`,
        ),
        category ? eq(schema.deals.category, category) : undefined,
      ),
    )
    .orderBy(desc(schema.deals.createdAt))
    .limit(50);

  const items: DealRow[] = rows
    .filter((r) => isActiveDeal(r.deal))
    .map((r) => ({
      id: r.deal.id,
      sponsorId: r.deal.sponsorId,
      title: r.deal.title,
      description: r.deal.description,
      bannerUrl: r.deal.bannerUrl,
      category: r.deal.category,
      discountValue: r.deal.discountValue,
      endsAt: r.deal.endsAt,
      brandName: r.brandName,
      logoUrl: r.logoUrl,
    }));

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(items));
  return items;
}

export async function invalidateDealsCache(universityIds: string[]): Promise<void> {
  if (universityIds.includes('*')) {
    const keys = await redis.keys('deals:*');
    if (keys.length) await redis.del(...keys);
    return;
  }
  for (const id of universityIds) {
    const keys = await redis.keys(`${dealsKey(id)}*`);
    if (keys.length) await redis.del(...keys);
  }
}
