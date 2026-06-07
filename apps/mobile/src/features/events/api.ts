import type { CreateEventInput, EventData } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export function createEvent(body: CreateEventInput) {
  return api.post<{ event: EventData; postId: string }>('/events', body);
}

export function getEvent(id: string) {
  return api.get<{ event: EventData }>(`/events/${id}`);
}

export function joinEvent(id: string) {
  return api.post<{ status: 'joined' | 'pending' }>(`/events/${id}/join`);
}

export function leaveEvent(id: string) {
  return api.post<{ success: boolean }>(`/events/${id}/leave`);
}
