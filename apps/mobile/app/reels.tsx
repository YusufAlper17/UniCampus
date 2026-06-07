import { useCallback, useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Post } from '@unicampus/shared-types';
import { Text } from '../src/ui/Text.js';
import { Avatar } from '../src/ui/Avatar.js';
import { EmptyState } from '../src/ui/EmptyState.js';
import { useTheme } from '../src/lib/theme.js';
import { getReels, type ReelsPage } from '../src/features/reels/api.js';
import { likePost, unlikePost } from '../src/features/posts/api.js';
import { FlatList } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

export default function ReelsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, { liked: boolean; count: number }>>({});

  const reelsQuery = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: ({ pageParam }) => getReels(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: ReelsPage) => last.nextCursor,
  });

  const items: Post[] = reelsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const toggleLike = useCallback(
    async (post: Post) => {
      const cur = overrides[post.id] ?? { liked: !!post.likedByMe, count: post.likeCount };
      const next = { liked: !cur.liked, count: cur.count + (cur.liked ? -1 : 1) };
      setOverrides((o) => ({ ...o, [post.id]: next }));
      try {
        if (cur.liked) await unlikePost(post.id);
        else await likePost(post.id);
      } catch {
        setOverrides((o) => ({ ...o, [post.id]: cur }));
      }
    },
    [overrides],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_H}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (reelsQuery.hasNextPage && !reelsQuery.isFetchingNextPage) reelsQuery.fetchNextPage();
        }}
        ListEmptyComponent={
          reelsQuery.isLoading ? null : (
            <View style={{ height: SCREEN_H, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <EmptyState
                icon="film-outline"
                title="Henüz reel yok"
                description="İlk kısa videoyu sen paylaş."
                actionLabel="Reel paylaş"
                onAction={() => router.push('/reel/create')}
              />
            </View>
          )
        }
        renderItem={({ item }) => {
          const ov = overrides[item.id];
          const liked = ov?.liked ?? !!item.likedByMe;
          const count = ov?.count ?? item.likeCount;
          return (
            <View style={{ height: SCREEN_H, width: '100%', backgroundColor: '#000' }}>
              <Image
                source={{ uri: item.mediaUrls[0] }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
              {/* video ipucu */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                pointerEvents="none"
              >
                <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.55)" />
              </View>

              {/* sağ aksiyon kolonu */}
              <View style={{ position: 'absolute', right: 12, bottom: 120, alignItems: 'center', gap: 18 }}>
                <Pressable onPress={() => toggleLike(item)} style={{ alignItems: 'center', gap: 2 }} hitSlop={8}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={34} color={liked ? '#ff3b6b' : '#fff'} />
                  <Text style={{ color: '#fff', fontSize: 12 }}>{count}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/post/${item.id}`)}
                  style={{ alignItems: 'center', gap: 2 }}
                  hitSlop={8}
                >
                  <Ionicons name="chatbubble-outline" size={32} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12 }}>{item.commentCount}</Text>
                </Pressable>
              </View>

              {/* alt bilgi */}
              <View style={{ position: 'absolute', left: 14, right: 70, bottom: 110, gap: 8 }}>
                <Pressable
                  onPress={() => item.author && router.push(`/u/${item.author.username}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Avatar uri={item.author?.avatarUrl ?? null} name={item.author?.displayName ?? '?'} size={36} />
                  <Text weight="600" style={{ color: '#fff' }}>
                    {item.author?.displayName ?? 'Kullanıcı'}
                  </Text>
                </Pressable>
                {item.content ? (
                  <Text style={{ color: '#fff' }} numberOfLines={2}>
                    {item.content}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {/* üst bar */}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
          <Text weight="700" style={{ color: '#fff', fontSize: 18 }}>
            Reels
          </Text>
          <Pressable onPress={() => router.push('/reel/create')} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={28} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
