import type {
  CreateMilestoneInput,
  CreateOpportunityInput,
  CreateProjectInput,
} from '@unicampus/shared-types';
import type { OpportunityEntity, ProjectEntity } from '../../ui/index.js';
import { api } from '../../lib/api.js';

export function createProject(body: CreateProjectInput) {
  return api.post<{ project: ProjectEntity; postId: string }>('/career/projects', body);
}

export function createMilestone(body: CreateMilestoneInput) {
  return api.post<{ postId: string }>('/career/milestones', body);
}

export function createOpportunity(body: CreateOpportunityInput) {
  return api.post<{ moderation: string; message: string }>('/career/opportunities', body);
}

export function getUserProjects(userId: string) {
  return api.get<{ items: ProjectEntity[] }>(`/career/users/${userId}/projects`);
}

export interface ProjectAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  careerHeadline?: string;
  isVerifiedStudent: boolean;
}

export function getProject(id: string) {
  return api.get<{ project: ProjectEntity; author: ProjectAuthor }>(`/career/projects/${id}`);
}

export interface MilestoneItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  occurredOn?: string;
  congratsCount: number;
  congratulatedByMe: boolean;
  createdAt: string;
}

export function getUserMilestones(userId: string) {
  return api.get<{ items: MilestoneItem[] }>(`/career/users/${userId}/milestones`);
}

export function congratulateMilestone(id: string) {
  return api.post<{ congratsCount: number; congratulated: boolean }>(
    `/career/milestones/${id}/congrats`,
  );
}

export function getOpportunities() {
  return api.get<{ items: OpportunityEntity[] }>('/career/opportunities');
}
