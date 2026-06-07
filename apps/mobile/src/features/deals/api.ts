import type { Deal } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export interface DealListItem extends Deal {
  brandName?: string;
  logoUrl?: string | null;
}

export async function getDeals(category?: string): Promise<{ items: DealListItem[] }> {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  return api.get(`/deals${q}`);
}

export async function revealDeal(id: string): Promise<{ discountCode: string; sponsorUrl?: string | null }> {
  return api.post(`/deals/${id}/reveal`);
}

export async function clickDeal(id: string): Promise<{ url: string }> {
  return api.post(`/deals/${id}/click`);
}

export async function trackAdImpression(campaignId: string): Promise<void> {
  await api.post('/ads/impression', { campaignId });
}
