import type { CreatePollInput, PollData } from '@unicampus/shared-types';
import { api } from '../../lib/api.js';

export function createPoll(body: CreatePollInput) {
  return api.post<{ poll: PollData; postId: string }>('/polls', body);
}

export function getPoll(id: string) {
  return api.get<{ poll: PollData }>(`/polls/${id}`);
}

export function votePoll(id: string, optionIds: string[]) {
  return api.post<{ poll: PollData }>(`/polls/${id}/vote`, { optionIds });
}
