import { api } from '../../lib/api.js';

export interface ReportResult {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export function createReport(body: {
  targetType: 'post' | 'comment' | 'user' | 'message' | 'community';
  targetId: string;
  reason: string;
  details?: string;
}) {
  return api.post<{ report: ReportResult }>('/reports', body);
}

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam veya reklam' },
  { value: 'harassment', label: 'Taciz veya zorbalık' },
  { value: 'inappropriate', label: 'Uygunsuz içerik' },
  { value: 'misinformation', label: 'Yanıltıcı bilgi' },
  { value: 'other', label: 'Diğer' },
] as const;
