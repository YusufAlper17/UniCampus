import type { FastifyReply, FastifyRequest } from 'fastify';
import { db, schema } from '../db/index.js';
import { requireAuth } from './context.js';
import type { AccessClaims } from './tokens.js';

export type AdminRole = 'moderator' | 'admin' | 'super_admin';

const RANK: Record<AdminRole, number> = { moderator: 1, admin: 2, super_admin: 3 };

/**
 * Yetkili admin gate'i. Minimum role (varsayılan 'admin') sağlanmazsa 403.
 * Roller account_type üzerinden okunur: admin < super_admin.
 */
export function requireAdmin(
  req: FastifyRequest,
  reply: FastifyReply,
  minRole: AdminRole = 'admin',
): AccessClaims | null {
  const auth = requireAuth(req, reply);
  if (!auth) return null;
  const userRank = RANK[auth.type as AdminRole] ?? 0;
  if (userRank < RANK[minRole]) {
    reply.code(403).send({ error: { code: 'forbidden', message: 'Yetkisiz erişim' } });
    return null;
  }
  return auth;
}

export async function audit(
  adminId: string,
  action: string,
  target?: { type?: string; id?: string },
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(schema.adminAuditLogs).values({
    adminId,
    action,
    targetType: target?.type,
    targetId: target?.id,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  });
}
