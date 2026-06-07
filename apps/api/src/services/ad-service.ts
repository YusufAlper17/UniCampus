import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { adsKey, redis } from '../redis.js';

const CACHE_TTL = 60;

export interface ActiveAd {
  campaignId: string;
  mediaUrl: string;
  ctaText: string;
  targetUrl: string;
  feedPositionInterval: number;
}

interface Targeting {
  universities?: string[];
  departments?: string[];
  class_years?: number[];
  account_types?: string[];
}

function parseTargeting(raw: string | null): Targeting {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Targeting;
  } catch {
    return {};
  }
}

function matchesTargeting(
  targeting: Targeting,
  universityId: string,
  department?: string | null,
  classYear?: number | null,
  accountType?: string,
): boolean {
  if (targeting.universities?.length && !targeting.universities.includes(universityId)) return false;
  if (targeting.departments?.length && department && !targeting.departments.includes(department)) return false;
  if (targeting.class_years?.length && classYear != null && !targeting.class_years.includes(classYear)) return false;
  if (targeting.account_types?.length && accountType && !targeting.account_types.includes(accountType)) return false;
  return true;
}

function isActiveCampaign(row: {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (row.status !== 'active') return false;
  const now = Date.now();
  if (row.startsAt && row.startsAt.getTime() > now) return false;
  if (row.endsAt && row.endsAt.getTime() < now) return false;
  return true;
}

/** Aktif reklam kampanyaları — yalnızca sosyal feed için. */
export async function getActiveAds(
  universityId: string,
  userMeta?: { department?: string | null; classYear?: number | null; accountType?: string },
): Promise<ActiveAd[]> {
  const cacheKey = adsKey(universityId);
  let campaigns: (typeof schema.adCampaigns.$inferSelect)[];

  const cached = await redis.get(cacheKey);
  if (cached) {
    campaigns = JSON.parse(cached) as (typeof schema.adCampaigns.$inferSelect)[];
  } else {
    campaigns = await db.select().from(schema.adCampaigns).where(eq(schema.adCampaigns.status, 'active')).limit(50);
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(campaigns));
  }

  return campaigns
    .filter((c) => isActiveCampaign(c))
    .filter((c) => matchesTargeting(parseTargeting(c.targeting), universityId, userMeta?.department, userMeta?.classYear, userMeta?.accountType))
    .map((c) => ({
      campaignId: c.id,
      mediaUrl: c.mediaUrl,
      ctaText: c.ctaText ?? 'Daha Fazla',
      targetUrl: c.targetUrl ?? '',
      feedPositionInterval: c.feedPositionInterval,
    }));
}

/** Reklamları feed slot pozisyonlarına enjekte et (max 1/interval). */
export function injectAds<T>(
  items: T[],
  ads: ActiveAd[],
): (T | { type: 'ad'; campaignId: string; mediaUrl: string; ctaText: string; targetUrl: string })[] {
  if (!ads.length) return items;
  const result: (T | { type: 'ad'; campaignId: string; mediaUrl: string; ctaText: string; targetUrl: string })[] = [];
  let adIdx = 0;
  const interval = ads[0]?.feedPositionInterval ?? 5;

  for (let i = 0; i < items.length; i++) {
    result.push(items[i]!);
    if ((i + 1) % interval === 0 && adIdx < ads.length) {
      const ad = ads[adIdx % ads.length]!;
      result.push({
        type: 'ad',
        campaignId: ad.campaignId,
        mediaUrl: ad.mediaUrl,
        ctaText: ad.ctaText,
        targetUrl: ad.targetUrl,
      });
      adIdx++;
    }
  }
  return result;
}

export async function invalidateAdsCache(universityId?: string): Promise<void> {
  if (universityId) {
    await redis.del(adsKey(universityId));
    return;
  }
  const keys = await redis.keys('ads:active:*');
  if (keys.length) await redis.del(...keys);
}
