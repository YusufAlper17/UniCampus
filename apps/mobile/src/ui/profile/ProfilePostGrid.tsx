import { Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '@unicampus/shared-types';
import { useTheme } from '../../lib/theme.js';
import { Text } from '../Text.js';
import { EmptyState } from '../EmptyState.js';

function firstMedia(post: Post) {
  if (post.media?.length) return post.media[0];
  if (post.mediaUrls.length) return { type: 'image' as const, url: post.mediaUrls[0] };
  return null;
}

function mediaCount(post: Post) {
  return post.media?.length ?? post.mediaUrls.length;
}

interface ProfilePostGridProps {
  posts: Post[];
  onPostPress: (postId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function ProfilePostGrid({
  posts,
  onPostPress,
  emptyTitle = 'Henüz gönderi yok',
  emptyDescription = 'İlk gönderini paylaşarak başla.',
  emptyActionLabel,
  onEmptyAction,
}: ProfilePostGridProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const cell = (width - 2) / 3;

  if (!posts.length) {
    return (
      <EmptyState
        icon="images-outline"
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
      {posts.map((p) => {
        const m = firstMedia(p);
        const count = mediaCount(p);
        return (
          <Pressable key={p.id} onPress={() => onPostPress(p.id)} style={{ width: cell, height: cell }}>
            <View style={{ flex: 1, backgroundColor: theme.surface3, overflow: 'hidden' }}>
              {m ? (
                <Image source={{ uri: m.poster ?? m.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, padding: 8, justifyContent: 'center' }}>
                  <Text variant="micro" tone="secondary" numberOfLines={5}>
                    {p.content}
                  </Text>
                </View>
              )}
              {m?.type === 'video' ? (
                <Ionicons name="play" size={16} color="#fff" style={{ position: 'absolute', top: 6, right: 6 }} />
              ) : count > 1 ? (
                <Ionicons
                  name="copy-outline"
                  size={16}
                  color="#fff"
                  style={{ position: 'absolute', top: 6, right: 6 }}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
