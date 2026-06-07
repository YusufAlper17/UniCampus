import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL } from './api.js';
import { useAuthStore } from './auth-store.js';

type RealtimeEvent =
  | { kind: 'connected' }
  | { kind: 'message'; conversationId: string; message: unknown }
  | { kind: 'read'; conversationId: string; userId: string; readAt: string }
  | { kind: 'typing'; conversationId: string; userId: string }
  | { kind: 'channel_message'; channelId: string; communityId: string; message: unknown };

function wsUrl(token: string): string {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/realtime?token=${encodeURIComponent(token)}`;
}

/**
 * WebSocket realtime köprüsü — yeni mesaj/okundu olaylarında ilgili sorguları
 * geçersiz kılar. Bağlantı koparsa ekranlar polling ile güncel kalır (fallback).
 */
export function useRealtimeBridge(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let closed = false;

    function connect() {
      if (closed || !accessToken) return;
      const ws = new WebSocket(wsUrl(accessToken));
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as RealtimeEvent;
          if (event.kind === 'message') {
            void qc.invalidateQueries({ queryKey: ['messages', event.conversationId] });
            void qc.invalidateQueries({ queryKey: ['conversations'] });
          } else if (event.kind === 'read') {
            void qc.invalidateQueries({ queryKey: ['messages', event.conversationId] });
          } else if (event.kind === 'channel_message') {
            void qc.invalidateQueries({ queryKey: ['channel-messages', event.channelId] });
          }
        } catch {
          /* yoksay */
        }
      };

      ws.onclose = () => {
        if (closed) return;
        // Yeniden bağlan (basit backoff).
        retryRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      closed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [accessToken, qc]);
}
