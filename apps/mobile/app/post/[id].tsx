import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { PostCard } from '../../src/ui/PostCard.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { relativeTime } from '../../src/lib/format.js';
import {
  addComment,
  getComments,
  getPost,
  likePost,
  unlikePost,
} from '../../src/features/posts/api.js';
import { votePoll } from '../../src/features/polls/api.js';
import { joinEvent } from '../../src/features/events/api.js';
import { createReport, REPORT_REASONS } from '../../src/features/reports/api.js';
import { ApiError } from '../../src/lib/api.js';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');

  const postQuery = useQuery({ queryKey: ['post', id], queryFn: () => getPost(id) });
  const commentsQuery = useQuery({ queryKey: ['comments', id], queryFn: () => getComments(id) });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(id, content),
    onSuccess: () => {
      setDraft('');
      void qc.invalidateQueries({ queryKey: ['comments', id] });
      void qc.invalidateQueries({ queryKey: ['post', id] });
    },
    onError: () => toast.show('Yorum eklenemedi', 'error'),
  });

  async function toggleLike() {
    const post = postQuery.data?.post;
    if (!post) return;
    try {
      if (post.likedByMe) await unlikePost(id);
      else await likePost(id);
      void qc.invalidateQueries({ queryKey: ['post', id] });
    } catch {
      toast.show('İşlem başarısız', 'error');
    }
  }

  async function vote(optionId: string) {
    const post = postQuery.data?.post;
    if (!post?.poll) return;
    try {
      await votePoll(post.poll.id, [optionId]);
      void qc.invalidateQueries({ queryKey: ['post', id] });
    } catch {
      toast.show('Oy verilemedi', 'error');
    }
  }

  async function joinThisEvent() {
    const post = postQuery.data?.post;
    if (!post?.event) return;
    try {
      await joinEvent(post.event.id);
      void qc.invalidateQueries({ queryKey: ['post', id] });
    } catch {
      toast.show('Katılım başarısız', 'error');
    }
  }

  const post = postQuery.data?.post;
  const comments = commentsQuery.data?.items ?? [];

  function showReportMenu() {
    Alert.alert('Gönderiyi Şikayet Et', 'Neden şikayet ediyorsun?', [
      ...REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: () => void submitReport(r.value),
      })),
      { text: 'İptal', style: 'cancel' as const },
    ]);
  }

  async function submitReport(reason: string) {
    try {
      await createReport({ targetType: 'post', targetId: id, reason });
      toast.show('Şikayetin alındı. Teşekkürler.', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Şikayet gönderilemedi';
      toast.show(msg, 'error');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen
        options={{
          title: 'Gönderi',
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={showReportMenu} hitSlop={8} style={{ marginRight: 8 }}>
              <Ionicons name="flag-outline" size={22} color={theme.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            post ? (
              <PostCard post={post} onLike={toggleLike} onVote={vote} onJoinEvent={joinThisEvent} />
            ) : (
              <View style={{ padding: spacing[3], gap: 10 }}>
                <Skeleton height={40} />
                <Skeleton height={120} radius={12} />
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', gap: 10, padding: spacing[3] }}>
              <Avatar uri={item.author?.avatarUrl} name={item.author?.displayName} size={36} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text weight="600" variant="caption">
                    {item.author?.displayName ?? 'Kullanıcı'}
                  </Text>
                  <Text variant="micro" tone="muted">
                    {relativeTime(item.createdAt)}
                  </Text>
                </View>
                <Text>{item.content}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !commentsQuery.isLoading ? (
              <View style={{ paddingVertical: spacing[5] }}>
                <Text tone="muted" center>
                  İlk yorumu sen yaz.
                </Text>
              </View>
            ) : null
          }
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: spacing[2],
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.surface,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Yorum yaz..."
            placeholderTextColor={theme.textMuted}
            style={{
              flex: 1,
              backgroundColor: theme.surface2,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: theme.textPrimary,
            }}
          />
          <Pressable
            onPress={() => draft.trim() && commentMutation.mutate(draft.trim())}
            disabled={!draft.trim() || commentMutation.isPending}
            hitSlop={8}
          >
            <Ionicons
              name="send"
              size={24}
              color={draft.trim() ? theme.primary : theme.textMuted}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
