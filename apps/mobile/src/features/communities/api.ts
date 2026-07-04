import type {
  ChannelMessage,
  Community,
  CommunityChannel,
  CommunityDetail,
  CommunityMember,
  CreateCommunityInput,
  InviteLink,
  MemberStatus,
} from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export function getCommunities(opts?: {
  mine?: boolean;
  cursor?: string | null;
  sort?: 'trending';
  category?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.mine) params.set('mine', 'true');
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.sort) params.set('sort', opts.sort);
  if (opts?.category && opts.category !== 'all') params.set('category', opts.category);
  return api.get<{ items: Community[]; nextCursor: string | null }>(
    `/communities?${params.toString()}`,
  );
}

export function getCommunity(id: string) {
  return api.get<{ community: CommunityDetail }>(`/communities/${id}`);
}

export function createCommunity(body: CreateCommunityInput) {
  return api.post<{ community: Community }>('/communities', body);
}

export function joinCommunity(id: string) {
  return api.post<{ status: MemberStatus | 'pending' }>(`/communities/${id}/join`, {});
}

export function leaveCommunity(id: string) {
  return api.post<{ status: 'left' }>(`/communities/${id}/leave`, {});
}

export function getMembers(id: string) {
  return api.get<{ items: CommunityMember[] }>(`/communities/${id}/members`);
}

export function getCommunityPosts(id: string, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<{ items: import('@unicampus/shared-types').Post[]; nextCursor: string | null }>(
    `/communities/${id}/posts?${params.toString()}`,
  );
}

export interface PendingRequest {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export function getRequests(id: string) {
  return api.get<{ items: PendingRequest[] }>(`/communities/${id}/requests`);
}

export function approveRequest(id: string, userId: string) {
  return api.post<{ status: 'approved' }>(`/communities/${id}/requests/${userId}/approve`, {});
}

export function rejectRequest(id: string, userId: string) {
  return api.post<{ status: 'rejected' }>(`/communities/${id}/requests/${userId}/reject`, {});
}

export function createChannel(id: string, body: { name: string; description?: string }) {
  return api.post<{ channel: CommunityChannel }>(`/communities/${id}/channels`, body);
}

export function getChannelMessages(channelId: string, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<{ items: ChannelMessage[]; nextCursor: string | null }>(
    `/channels/${channelId}/messages?${params.toString()}`,
  );
}

export function sendChannelMessage(channelId: string, body: { content?: string; mediaUrl?: string }) {
  return api.post<{ message: ChannelMessage }>(`/channels/${channelId}/messages`, body);
}

export function createInvite(id: string, body?: { expiresInDays?: number; maxUses?: number }) {
  return api.post<{ invite: InviteLink }>(`/communities/${id}/invites`, body ?? {});
}

export function joinByToken(token: string) {
  return api.post<{ communityId: string; status: 'active' }>(`/join/${token}`);
}

export interface CommunityHubItem {
  community: Community;
  lastMessage?: {
    channelId: string;
    channelName: string;
    content: string;
    createdAt: string;
    senderName?: string;
  };
  unreadCount: number;
}

export function getMyCommunitiesHub() {
  return api.get<{ items: CommunityHubItem[] }>('/communities/mine/hub');
}

export function getMyCommunitiesFeed() {
  return api.get<{ items: { type: 'post'; post: import('@unicampus/shared-types').Post }[] }>(
    '/communities/mine/feed',
  );
}
