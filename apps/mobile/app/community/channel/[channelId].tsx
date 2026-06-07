import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChannelMessage } from '@unicampus/shared-types';
import { MessageBubble } from '../../../src/ui/MessageBubble.js';
import { ChatInput } from '../../../src/ui/ChatInput.js';
import { Text } from '../../../src/ui/Text.js';
import { EmptyState } from '../../../src/ui/EmptyState.js';
import { useTheme } from '../../../src/lib/theme.js';
import { getChannelMessages, sendChannelMessage } from '../../../src/features/communities/api.js';

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

interface ChannelPage {
  items: ChannelMessage[];
  nextCursor: string | null;
}

export default function ChannelScreen() {
  const { channelId, name } = useLocalSearchParams<{ channelId: string; name?: string }>();
  const id = String(channelId);
  const { theme } = useTheme();
  const qc = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['channel-messages', id],
    queryFn: ({ pageParam }) => getChannelMessages(id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: ChannelPage) => last.nextCursor,
    refetchInterval: 8000,
  });

  const messages: ChannelMessage[] = data ? data.pages.flatMap((p) => [...p.items].reverse()) : [];

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendChannelMessage(id, { content }),
    onMutate: async (content: string) => {
      await qc.cancelQueries({ queryKey: ['channel-messages', id] });
      const prev = qc.getQueryData(['channel-messages', id]);
      const optimistic: ChannelMessage = {
        id: `tmp-${Date.now()}`,
        channelId: id,
        communityId: '',
        senderId: 'me',
        content,
        createdAt: new Date().toISOString(),
        mine: true,
      };
      qc.setQueryData(
        ['channel-messages', id],
        (old: { pages: ChannelPage[]; pageParams: unknown[] } | undefined) => {
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
      if (ctx?.prev) qc.setQueryData(['channel-messages', id], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['channel-messages', id] });
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen options={{ headerShown: true, title: name ? `# ${name}` : 'Kanal' }} />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : messages.length === 0 ? (
        <EmptyState
          icon="chatbox-ellipses-outline"
          title="Kanal sessiz"
          description="İlk mesajı sen yaz."
        />
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View>
              {!item.mine && item.sender ? (
                <Text variant="micro" tone="brand" style={{ marginLeft: 14, marginTop: 4 }}>
                  {item.sender.displayName}
                </Text>
              ) : null}
              <MessageBubble
                content={item.content}
                mediaUrl={item.mediaUrl}
                mine={!!item.mine}
                time={timeLabel(item.createdAt)}
              />
            </View>
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
      <ChatInput onSend={(text) => sendMutation.mutate(text)} sending={sendMutation.isPending} />
    </KeyboardAvoidingView>
  );
}
