import type { ContentDomain, Post } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

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

export type SearchType = 'all' | 'user' | 'hashtag' | 'event';

export function search(q: string, type: SearchType) {
  const params = new URLSearchParams({ q, type });
  return api.get<{ users: UserHit[]; hashtags: HashtagHit[]; events: EventHit[] }>(
    `/search?${params.toString()}`,
  );
}

export interface ExplorePage {
  suggestedUsers: UserHit[];
  trending: HashtagHit[];
  posts: Post[];
  nextCursor: string | null;
}

export function getExplore(domain: ContentDomain, cursor?: string | null) {
  const params = new URLSearchParams({ domain });
  if (cursor) params.set('cursor', cursor);
  return api.get<ExplorePage>(`/explore?${params.toString()}`);
}
