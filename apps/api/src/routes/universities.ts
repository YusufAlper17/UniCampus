import { asc, ilike, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { universitiesQuerySchema } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';

// Kayıt akışı adım 2: üniversite arama (public, auth gerektirmez).
export const universityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/universities', async (req, reply) => {
    const parsed = universitiesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz sorgu', details: parsed.error.issues },
      });
    }
    const { q, limit } = parsed.data;

    const rows = await db
      .select({
        id: schema.universities.id,
        name: schema.universities.name,
        shortName: schema.universities.shortName,
        city: schema.universities.city,
        logoUrl: schema.universities.logoUrl,
        domains: sql<string[]>`coalesce(array_agg(${schema.universityDomains.domain}), '{}')`,
      })
      .from(schema.universities)
      .leftJoin(
        schema.universityDomains,
        sql`${schema.universityDomains.universityId} = ${schema.universities.id}`,
      )
      .where(q ? ilike(schema.universities.name, `%${q}%`) : undefined)
      .groupBy(schema.universities.id)
      .orderBy(asc(schema.universities.name))
      .limit(limit);

    return reply.send({ items: rows });
  });
};
