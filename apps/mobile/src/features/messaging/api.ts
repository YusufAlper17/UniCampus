import type { Conversation, Message } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export function getConversations() {
  return api.get<{ items: Conversation[] }>('/conversations');
}

export function createConversation(body: {
  type: 'dm' | 'group';
  memberIds: string[];
  title?: string;
}) {
  return api.post<{ conversation: Conversation }>('/conversations', body);
}

export function getMessages(conversationId: string, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<{ items: Message[]; nextCursor: string | null }>(
    `/conversations/${conversationId}/messages?${params.toString()}`,
  );
}

export function sendMessage(
  conversationId: string,
  body: { content?: string; mediaUrl?: string; viewOnce?: boolean },
) {
  return api.post<{ message: Message }>(`/conversations/${conversationId}/messages`, body);
}

export function setDisappearing(conversationId: string, seconds: number) {
  return api.post<{ disappearingSeconds: number }>(
    `/conversations/${conversationId}/disappearing`,
    { seconds },
  );
}

export function viewMessage(messageId: string) {
  return api.post<{ mediaUrl?: string; content?: string }>(`/messages/${messageId}/view`);
}

export function markRead(conversationId: string) {
  return api.post<{ readAt: string }>(`/conversations/${conversationId}/read`);
}

export function registerDevice(pushToken: string) {
  return api.post<{ success: boolean }>('/devices', { pushToken, platform: 'expo' });
}
