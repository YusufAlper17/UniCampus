import { api } from '../../lib/api.js';

export interface FollowRequest {
  followerId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ConnectionRequest {
  id: string;
  senderId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  careerHeadline: string | null;
  createdAt: string;
}

export function followUser(userId: string) {
  return api.post<{ status: 'active' | 'pending' }>(`/users/${userId}/follow`);
}

export function unfollowUser(userId: string) {
  return api.delete<{ success: boolean }>(`/users/${userId}/follow`);
}

export function getFollowRequests() {
  return api.get<{ items: FollowRequest[] }>('/follow-requests');
}

export function acceptFollowRequest(followerId: string) {
  return api.post<{ success: boolean }>(`/follow-requests/${followerId}/accept`);
}

export function rejectFollowRequest(followerId: string) {
  return api.post<{ success: boolean }>(`/follow-requests/${followerId}/reject`);
}

export function requestConnection(receiverId: string) {
  return api.post<{ status: 'pending' }>('/connections/request', { receiverId });
}

export function getConnectionRequests() {
  return api.get<{ items: ConnectionRequest[] }>('/connections/requests');
}

export function acceptConnection(id: string) {
  return api.post<{ success: boolean }>(`/connections/${id}/accept`);
}

export function rejectConnection(id: string) {
  return api.post<{ success: boolean }>(`/connections/${id}/reject`);
}

export interface SuggestionItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  careerHeadline?: string;
  department?: string;
  mutualCount: number;
  reason: string;
}

export function getConnectionSuggestions() {
  return api.get<{ items: SuggestionItem[] }>('/connections/suggestions');
}
