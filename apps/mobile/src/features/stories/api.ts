import type { CreateStoryInput, Story, StoryGroup } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export function getStories() {
  return api.get<{ items: StoryGroup[] }>('/stories');
}

export function getUserStories(userId: string) {
  return api.get<{ items: Story[] }>(`/stories/user/${userId}`);
}

export function createStory(body: CreateStoryInput) {
  return api.post<{ story: Story }>('/stories', body);
}

export function viewStory(storyId: string) {
  return api.post<{ seen: boolean }>(`/stories/${storyId}/view`);
}

export function deleteStory(storyId: string) {
  return api.delete<{ success: boolean }>(`/stories/${storyId}`);
}

export interface CloseFriend {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export function getCloseFriends() {
  return api.get<{ items: CloseFriend[] }>('/close-friends');
}

export function addCloseFriend(userId: string) {
  return api.post<{ added: boolean }>(`/close-friends/${userId}`);
}

export function removeCloseFriend(userId: string) {
  return api.delete<{ removed: boolean }>(`/close-friends/${userId}`);
}
