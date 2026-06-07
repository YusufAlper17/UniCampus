import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { env } from './env.js';
import { authRoutes } from './routes/auth.js';
import { feedRoutes } from './routes/feed.js';
import { healthRoutes } from './routes/health.js';
import { universityRoutes } from './routes/universities.js';
import { userRoutes } from './routes/users.js';
import { socialGraphRoutes } from './routes/social-graph.js';
import { postRoutes } from './routes/posts.js';
import { eventRoutes } from './routes/events.js';
import { pollRoutes } from './routes/polls.js';
import { careerRoutes } from './routes/career.js';
import { searchRoutes } from './routes/search.js';
import { messagingRoutes } from './routes/messaging.js';
import { realtimeRoutes } from './routes/realtime.js';
import { communityRoutes } from './routes/communities.js';
import { adminRoutes } from './routes/admin.js';
import { monetizationRoutes } from './routes/monetization.js';
import { dealsRoutes } from './routes/deals.js';
import { adsRoutes } from './routes/ads.js';
import { reportRoutes } from './routes/reports.js';
import { storyRoutes } from './routes/stories.js';
import { reelRoutes } from './routes/reels.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty' } }
        : true,
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  // Genel hız sınırı. Test ortamında entegrasyon testleri throttle olmasın diye yüksek.
  // Sağlık/readiness probe'ları (orchestrator) hız sınırından muaftır.
  await app.register(rateLimit, {
    max: env.NODE_ENV === 'test' ? 100_000 : 100,
    timeWindow: '1 minute',
    allowList: (req) => req.url.startsWith('/v1/health'),
  });

  // Auth decorator — korumalı route'larda onRequest hook olarak kullanılır.
  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: { code: 'unauthorized', message: 'Oturum gerekli' } });
    }
  });

  await app.register(healthRoutes, { prefix: '/v1' });
  await app.register(authRoutes, { prefix: '/v1' });
  await app.register(universityRoutes, { prefix: '/v1' });
  await app.register(userRoutes, { prefix: '/v1' });
  await app.register(socialGraphRoutes, { prefix: '/v1' });
  await app.register(postRoutes, { prefix: '/v1' });
  await app.register(eventRoutes, { prefix: '/v1' });
  await app.register(pollRoutes, { prefix: '/v1' });
  await app.register(careerRoutes, { prefix: '/v1' });
  await app.register(searchRoutes, { prefix: '/v1' });
  await app.register(messagingRoutes, { prefix: '/v1' });
  await app.register(realtimeRoutes, { prefix: '/v1' });
  await app.register(communityRoutes, { prefix: '/v1' });
  await app.register(adminRoutes, { prefix: '/v1' });
  await app.register(monetizationRoutes, { prefix: '/v1' });
  await app.register(dealsRoutes, { prefix: '/v1' });
  await app.register(adsRoutes, { prefix: '/v1' });
  await app.register(feedRoutes, { prefix: '/v1' });
  await app.register(reportRoutes, { prefix: '/v1' });
  await app.register(storyRoutes, { prefix: '/v1' });
  await app.register(reelRoutes, { prefix: '/v1' });

  return app;
}
