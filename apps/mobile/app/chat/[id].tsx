import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Conversation, Message } from '@unicampus/shared-types';
import { MessageBubble } from '../../src/ui/MessageBubble.js';
import { ChatInput } from '../../src/ui/ChatInput.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { Text } from '../../src/ui/Text.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import {
  getConversations,
  getMessages,
  markRead,
  sendMessage,
  setDisappearing,
  viewMessage,
} from '../../src/features/messaging/api.js';

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

const DISAPPEARING_OPTIONS: { label: string; seconds: number }[] = [
  { label: 'Kapalı', seconds: 0 },
  { label: '1 gün', seconds: 86400 },
  { label: '1 hafta', seconds: 604800 },
  { label: '90 gün', seconds: 7776000 },
];

function disappearingLabel(seconds?: number): string {
  if (!seconds) return 'Kapalı';
  return DISAPPEARING_OPTIONS.find((o) => o.seconds === seconds)?.label ?? `${seconds}s`;
}

interface MessagePage {
  items: Message[];
  nextCursor: string | null;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = String(id);
  const { theme, spacing, radius } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const listRef = useRef<FlatList<Message>>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [reveal, setReveal] = useState<{ mediaUrl?: string; content?: string } | null>(null);

  const { data: conversations } = useQuery({ queryKey: ['conversations'], queryFn: getConversations });
  const conversation = conversations?.items.find((c: Conversation) => c.id === conversationId);
  const title =
    conversation?.type === 'group'
      ? conversation.title ?? 'Grup'
      : conversation?.peer?.displayName ?? 'Sohbet';
  const isGroup = conversation?.type === 'group';
  const disappearing = conversation?.disappearingSeconds ?? 0;

  async function applyDisappearing(seconds: number) {
    setTimerOpen(false);
    try {
      await setDisappearing(conversationId, seconds);
      await qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.show(seconds ? `Kaybolan mesaj: ${disappearingLabel(seconds)}` : 'Kaybolan mesaj kapalı', 'success');
    } catch {
      toast.show('Ayarlanamadı', 'error');
    }
  }

  async function openViewOnce(messageId: string) {
    try {
      const res = await viewMessage(messageId);
      setReveal({ mediaUrl: res.mediaUrl, content: res.content });
      void qc.invalidateQueries({ queryKey: ['messages', conversationId] });
    } catch {
      toast.show('Medya artık görüntülenemiyor', 'error');
      void qc.invalidateQueries({ queryKey: ['messages', conversationId] });
    }
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) => getMessages(conversationId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: MessagePage) => lastPage.nextCursor,
    refetchInterval: 8000,
  });

  // Inverted liste: en yeni mesaj en altta (data[0]).
  const messages: Message[] = data ? data.pages.flatMap((p) => [...p.items].reverse()) : [];
  const newest = messages[0];

  // Yeni gelen (karşı taraf) mesajda okundu işaretle.
  useEffect(() => {
    if (!newest) return;
    if (newest.mine) return;
    void markRead(conversationId).then(() => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    });
  }, [newest?.id, conversationId, qc, newest]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, { content }),
    onMutate: async (content: string) => {
      await qc.cancelQueries({ queryKey: ['messages', conversationId] });
      const prev = qc.getQueryData(['messages', conversationId]);
      const optimistic: Message = {
        id: `tmp-${Date.now()}`,
        conversationId,
        senderId: 'me',
        content,
        createdAt: new Date().toISOString(),
        mine: true,
      };
      qc.setQueryData(
        ['messages', conversationId],
        (old: { pages: MessagePage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          const pages = old.pages.map((p, i) =>
            i === 0 ? { ...p, items: [...p.items, optimistic] } : p,
          );
          return { ...old, pages };
        },
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['messages', conversationId], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const sendMediaMutation = useMutation({
    mutationFn: ({ mediaUrl, viewOnce }: { mediaUrl: string; viewOnce: boolean }) =>
      sendMessage(conversationId, { mediaUrl, viewOnce }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerRight: () => (
            <Pressable onPress={() => setTimerOpen(true)} hitSlop={10}>
              <Ionicons
                name={disappearing ? 'timer' : 'timer-outline'}
                size={22}
                color={disappearing ? theme.primary : theme.textPrimary}
              />
            </Pressable>
          ),
        }}
      />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : messages.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Sohbete başla"
          description="İlk mesajı göndererek konuşmayı başlat."
        />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          inverted
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble
              content={item.content}
              mediaUrl={item.mediaUrl}
              mine={!!item.mine}
              time={timeLabel(item.createdAt)}
              read={item.readByPeer}
              showRead={!isGroup}
              viewOnce={item.viewOnce}
              viewed={item.viewed}
              onView={() => openViewOnce(item.id)}
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
      {disappearing ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
            paddingVertical: 4,
            backgroundColor: theme.surface2,
          }}
        >
          <Ionicons name="timer-outline" size={13} color={theme.textMuted} />
          <Text variant="micro" tone="muted">
            Kaybolan mesajlar açık · {disappearingLabel(disappearing)}
          </Text>
        </View>
      ) : null}

      <ChatInput
        onSend={(text) => sendMutation.mutate(text)}
        onSendMedia={(mediaUrl, viewOnce) => sendMediaMutation.mutate({ mediaUrl, viewOnce })}
        sending={sendMutation.isPending}
      />

      {/* Kaybolan mesaj süresi seçici */}
      <Modal visible={timerOpen} transparent animationType="slide" onRequestClose={() => setTimerOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setTimerOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing[4],
              gap: spacing[2],
            }}
          >
            <Text variant="headingMd">Kaybolan mesajlar</Text>
            <Text tone="muted" style={{ marginBottom: spacing[2] }}>
              Yeni mesajlar seçilen süre sonunda otomatik silinir.
            </Text>
            {DISAPPEARING_OPTIONS.map((opt) => {
              const active = disappearing === opt.seconds;
              return (
                <Pressable
                  key={opt.seconds}
                  onPress={() => applyDisappearing(opt.seconds)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: radius.md,
                    backgroundColor: active ? theme.primary + '18' : theme.surface2,
                  }}
                >
                  <Text weight={active ? '600' : '400'} tone={active ? 'brand' : 'primary'}>
                    {opt.label}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={20} color={theme.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tek görüntülemelik medya gösterimi */}
      <Modal visible={!!reveal} transparent animationType="fade" onRequestClose={() => setReveal(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setReveal(null)}
        >
          {reveal?.mediaUrl ? (
            <Image source={{ uri: reveal.mediaUrl }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          ) : reveal?.content ? (
            <Text style={{ color: '#fff', fontSize: 18, padding: 24 }}>{reveal.content}</Text>
          ) : null}
          <View style={{ position: 'absolute', bottom: 48, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Bu medya yalnızca bir kez görüntülenir</Text>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
