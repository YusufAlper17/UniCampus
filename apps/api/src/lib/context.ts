import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AccessClaims } from './tokens.js';

/** JWT claim'lerinden tipli auth context. authenticate decorator'ından sonra kullanılır. */
export function getAuth(req: FastifyRequest): AccessClaims | null {
  const user = req.user as Partial<AccessClaims> | undefined;
  if (!user?.sub || !user.university_id) return null;
  return user as AccessClaims;
}

export function requireAuth(req: FastifyRequest, reply: FastifyReply): AccessClaims | null {
  const auth = getAuth(req);
  if (!auth) {
    reply.code(401).send({ error: { code: 'unauthorized', message: 'Oturum gerekli' } });
    return null;
  }
  return auth;
}
