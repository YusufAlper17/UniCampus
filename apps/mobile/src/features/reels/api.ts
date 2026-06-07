import type { CreateReelInput, Post } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export interface ReelsPage {
  items: Post[];
  nextCursor: string | null;
}

export function getReels(cursor?: string | null) {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return api.get<ReelsPage>(`/reels${qs}`);
}

export function createReel(body: CreateReelInput) {
  return api.post<{ reel: Post }>('/reels', body);
}
