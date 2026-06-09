import type { ContentDomain, FeedItem, Post, Comment, PostType } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

export function getFeed(cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<FeedPage>(`/feed?${params.toString()}`);
}

export interface CreatePostBody {
  contentDomain?: ContentDomain;
  type?: PostType;
  content?: string;
  mediaUrls?: string[];
  visibility?: 'public' | 'followers' | 'connections' | 'private';
}

export function createPost(body: CreatePostBody) {
  return api.post<{ post: Post }>('/posts', body);
}

export function getPost(id: string) {
  return api.get<{ post: Post }>(`/posts/${id}`);
}

export function likePost(id: string) {
  return api.post<{ liked: boolean }>(`/posts/${id}/like`);
}

export function unlikePost(id: string) {
  return api.delete<{ liked: boolean }>(`/posts/${id}/like`);
}

export function getComments(postId: string, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<{ items: Comment[]; nextCursor: string | null }>(
    `/posts/${postId}/comments?${params.toString()}`,
  );
}

export function addComment(postId: string, content: string) {
  return api.post<{ comment: Comment }>(`/posts/${postId}/comments`, { content });
}

export interface TrendingTag {
  tag: string;
  usageCount: number;
}

export function getTrending() {
  return api.get<{ items: TrendingTag[] }>('/trending');
}
