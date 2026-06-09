import type { AccountType, AccountVisibility, Post, Visibility } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export function getUserPosts(userId: string) {
  return api.get<{ items: Post[] }>(`/users/${userId}/posts`);
}

export interface ProfileUser {
  id: string;
  universityId: string;
  type: AccountType;
  status: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  careerHeadline?: string;
  accountVisibility: AccountVisibility;
  careerVisibility: Visibility;
  isVerifiedStudent: boolean;
  isVerifiedOrg: boolean;
  followerCount: number;
  followingCount?: number;
  connectionCount: number;
  postCount: number;
  statusText?: string;
  statusEmoji?: string;
  twoFactorEnabled?: boolean;
  createdAt: string;
}

export interface Preferences {
  userId: string;
  defaultFeedTab: 'social' | 'career';
  socialNotifications: boolean;
  careerNotifications: boolean;
  dmPermission: Visibility;
  theme: 'system' | 'light' | 'dark';
  locale: string;
}

export interface AcademicProfile {
  userId: string;
  faculty?: string | null;
  department?: string | null;
  classYear?: number | null;
  gpa?: string | null;
  studentNo?: string | null;
  graduationYear?: number | null;
  fieldVisibility: string;
}

export interface MeResponse {
  user: ProfileUser;
  preferences: Preferences | null;
  academic: AcademicProfile | null;
  featuredCommunities?: FeaturedCommunity[];
  myCommunityIds?: string[];
}

export interface FeaturedCommunity {
  id: string;
  name: string;
  avatarUrl?: string;
  category?: string;
}

export function updateFeaturedCommunities(communityIds: string[]) {
  return api.patch<{ featuredCommunities: FeaturedCommunity[] }>('/users/me/featured-communities', {
    communityIds,
  });
}

export function getMe() {
  return api.get<MeResponse>('/users/me');
}

export interface PublicAcademic {
  faculty?: string | null;
  department?: string | null;
  classYear?: number | null;
  graduationYear?: number | null;
  gpa?: number | null;
  studentNo?: string | null;
}

export function getProfile(username: string) {
  return api.get<{
    user: ProfileUser;
    academic: PublicAcademic | null;
    featuredCommunities?: FeaturedCommunity[];
  }>(`/users/${username}`);
}

export interface UpdateProfileBody {
  displayName?: string;
  bio?: string;
  careerHeadline?: string;
  accountVisibility?: AccountVisibility;
  careerVisibility?: Visibility;
}

export function updateProfile(body: UpdateProfileBody) {
  return api.patch<{ user: ProfileUser }>('/users/me', body);
}

export function updateAcademic(body: Record<string, unknown>) {
  return api.put<{ academic: AcademicProfile }>('/users/me/academic', body);
}

export function updatePreferences(body: Partial<Preferences>) {
  return api.patch<{ preferences: Preferences }>('/users/me/preferences', body);
}

export function updateStatus(body: { statusText?: string | null; statusEmoji?: string | null }) {
  return api.put<{ statusText?: string; statusEmoji?: string }>('/users/me/status', body);
}
