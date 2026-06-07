import { redis } from '../redis.js';

/**
 * Hafif realtime katmanı: Redis pub/sub + süreç içi soket kaydı.
 * Her kullanıcı `rt:user:{id}` kanalına abone; mesaj/typing olayları buradan akar.
 * Ölçekte Centrifugo'ya taşınır (bkz. docs). İstemci ayrıca polling ile fallback yapar.
 */

interface Sink {
  send: (data: string) => void;
}

const registry = new Map<string, Set<Sink>>();
let subscriber: ReturnType<typeof redis.duplicate> | null = null;

function ensureSubscriber(): void {
  if (subscriber) return;
  subscriber = redis.duplicate();
  void subscriber.psubscribe('rt:user:*');
  subscriber.on('pmessage', (_pattern, channel, message) => {
    const userId = channel.slice('rt:user:'.length);
    const sinks = registry.get(userId);
    if (!sinks) return;
    for (const sink of sinks) {
      try {
        sink.send(message);
      } catch {
        /* kopuk soket; cleanup unregister'da */
      }
    }
  });
}

export function registerSocket(userId: string, sink: Sink): void {
  ensureSubscriber();
  let set = registry.get(userId);
  if (!set) {
    set = new Set();
    registry.set(userId, set);
  }
  set.add(sink);
}

export function unregisterSocket(userId: string, sink: Sink): void {
  const set = registry.get(userId);
  if (!set) return;
  set.delete(sink);
  if (set.size === 0) registry.delete(userId);
}

export type RealtimeEvent =
  | { kind: 'message'; conversationId: string; message: unknown }
  | { kind: 'read'; conversationId: string; userId: string; readAt: string }
  | { kind: 'typing'; conversationId: string; userId: string }
  | { kind: 'channel_message'; channelId: string; communityId: string; message: unknown };

export async function publishToUsers(userIds: string[], event: RealtimeEvent): Promise<void> {
  const payload = JSON.stringify(event);
  await Promise.all(userIds.map((id) => redis.publish(`rt:user:${id}`, payload)));
}
