import type { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';
import { registerSocket, unregisterSocket } from '../lib/realtime.js';

interface AccessClaims {
  sub: string;
  university_id: string;
}

/**
 * WebSocket gateway — istemci `/v1/realtime?token=<access>` ile bağlanır.
 * Sunucu JWT doğrular, kullanıcıyı Redis pub/sub kanalına bağlar.
 * İstemci ayrıca polling ile fallback yapar; WS sadece anlık iletim hızlandırması.
 */
export const realtimeRoutes: FastifyPluginAsync = async (app) => {
  await app.register(websocket);

  app.get('/realtime', { websocket: true }, (connection, req) => {
    const token = (req.query as { token?: string }).token;
    let claims: AccessClaims | null = null;
    try {
      if (token) claims = app.jwt.verify<AccessClaims>(token);
    } catch {
      claims = null;
    }
    if (!claims) {
      connection.socket.close(1008, 'unauthorized');
      return;
    }

    const userId = claims.sub;
    const sink = { send: (data: string) => connection.socket.send(data) };
    registerSocket(userId, sink);

    connection.socket.send(JSON.stringify({ kind: 'connected' }));

    connection.socket.on('close', () => unregisterSocket(userId, sink));
    connection.socket.on('error', () => unregisterSocket(userId, sink));
  });
};
