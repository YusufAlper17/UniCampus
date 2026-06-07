import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

// Access token (kısa ömür) + refresh token rotation (uzun ömür, DB'de hash'li).
const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;

export interface AccessClaims {
  sub: string;
  university_id: string;
  type: string;
  username: string;
}

export function signAccessToken(app: FastifyInstance, claims: AccessClaims): string {
  return app.jwt.sign(claims, { expiresIn: ACCESS_TTL });
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueRefreshToken(userId: string, deviceInfo?: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(schema.refreshTokens).values({ userId, tokenHash, deviceInfo, expiresAt });
  return raw;
}

/** Rotation: eski token revoke edilir, yeni token üretilir. Geçersizse null. */
export async function rotateRefreshToken(
  rawToken: string,
  deviceInfo?: string,
): Promise<{ userId: string; refreshToken: string } | null> {
  const tokenHash = hashToken(rawToken);
  const [record] = await db
    .select()
    .from(schema.refreshTokens)
    .where(
      and(
        eq(schema.refreshTokens.tokenHash, tokenHash),
        gt(schema.refreshTokens.expiresAt, new Date()),
        isNull(schema.refreshTokens.revokedAt),
      ),
    )
    .limit(1);

  if (!record) return null;

  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.refreshTokens.id, record.id));

  const refreshToken = await issueRefreshToken(record.userId, deviceInfo);
  return { userId: record.userId, refreshToken };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.refreshTokens.tokenHash, tokenHash));
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.refreshTokens.userId, userId));
}
