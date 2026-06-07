import type { MemberRole } from '@unicampus/shared-types';
import { Badge } from './Badge.js';

const ROLE_META: Record<MemberRole, { label: string; tone: 'brand' | 'info' | 'warning' } | null> = {
  owner: { label: 'Sahip', tone: 'brand' },
  admin: { label: 'Yönetici', tone: 'info' },
  moderator: { label: 'Moderatör', tone: 'warning' },
  member: null,
};

export function MemberRoleBadge({ role }: { role: MemberRole }) {
  const meta = ROLE_META[role];
  if (!meta) return null;
  return <Badge label={meta.label} tone={meta.tone} />;
}
