import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { ContentDomain, FeedItem } from '@unicampus/shared-types';
import { Text } from '../../src/ui/Text.js';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { PostCard } from '../../src/ui/PostCard.js';
import { AdCard } from '../../src/ui/AdCard.js';
import { StoryRing } from '../../src/ui/StoryRing.js';
import { TrendChip } from '../../src/ui/TrendChip.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useTheme } from '../../src/lib/theme.js';
import {
  getFeed,
  getTrending,
  likePost,
  unlikePost,
  type FeedPage,
} from '../../src/features/posts/api.js';
import { votePoll } from '../../src/features/polls/api.js';
import { joinEvent } from '../../src/features/events/api.js';
import { getStories } from '../../src/features/stories/api.js';
import type { EventData, PollData, StoryGroup } from '@unicampus/shared-types';

export default function HomeFeed() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [domain, setDomain] = useState<ContentDomain>('social');
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', domain],
    queryFn: ({ pageParam }) => getFeed(domain, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: FeedPage) => last.nextCursor,
  });

  const trendingQuery = useQuery({
    queryKey: ['trending'],
    queryFn: getTrending,
    enabled: domain === 'social',
  });

  const storiesQuery = useQuery({
    queryKey: ['stories'],
    queryFn: getStories,
    enabled: domain === 'social',
  });

  const items: FeedItem[] = feedQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const storyGroups: StoryGroup[] = storiesQuery.data?.items ?? [];
  const storyItems = storyGroups.map((g) => ({
    id: g.author.id,
    name: g.isMine ? 'Hikayen' : g.author.displayName,
    avatarUrl: g.author.avatarUrl,
    seen: !g.hasUnseen,
  }));

  const openStory = useCallback(
    (authorId: string) => {
      const group = storyGroups.find((g) => g.author.id === authorId);
      if (!group) return;
      router.push({
        pathname: '/story/[userId]',
        params: {
          userId: authorId,
          name: group.author.displayName,
          avatar: group.author.avatarUrl ?? '',
          mine: group.isMine ? '1' : '0',
        },
      });
    },
    [storyGroups, router],
  );

  const toggleLike = useCallback(
    async (postId: string, liked: boolean) => {
      // Optimistic cache güncellemesi.
      qc.setQueryData<InfiniteData<FeedPage>>(['feed', domain], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((it) =>
              it.type === 'post' && it.post.id === postId
                ? {
                    ...it,
                    post: {
                      ...it.post,
                      likedByMe: !liked,
                      likeCount: it.post.likeCount + (liked ? -1 : 1),
                    },
                  }
                : it,
            ),
          })),
        };
      });
      try {
        if (liked) await unlikePost(postId);
        else await likePost(postId);
      } catch {
        void feedQuery.refetch();
      }
    },
    [domain, qc, feedQuery],
  );

  const patchPost = useCallback(
    (postId: string, patch: { poll?: PollData; event?: EventData }) => {
      qc.setQueryData<InfiniteData<FeedPage>>(['feed', domain], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((it) =>
              it.type === 'post' && it.post.id === postId
                ? { ...it, post: { ...it.post, ...patch } }
                : it,
            ),
          })),
        };
      });
    },
    [domain, qc],
  );

  const vote = useCallback(
    async (postId: string, pollId: string, optionId: string) => {
      try {
        const { poll } = await votePoll(pollId, [optionId]);
        patchPost(postId, { poll });
      } catch {
        void feedQuery.refetch();
      }
    },
    [patchPost, feedQuery],
  );

  const join = useCallback(
    async (postId: string, event: EventData) => {
      setJoiningEventId(event.id);
      try {
        const { status } = await joinEvent(event.id);
        patchPost(postId, {
          event: {
            ...event,
            myStatus: status,
            participantCount: event.participantCount + (status === 'joined' ? 1 : 0),
          },
        });
      } catch {
        void feedQuery.refetch();
      } finally {
        setJoiningEventId(null);
      }
    },
    [patchPost, feedQuery],
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
        }}
      >
        <Text variant="headingMd" tone="brand">
          UniCampus
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <Pressable onPress={() => router.push('/reels')} hitSlop={8}>
            <Ionicons name="play-circle-outline" size={24} color={theme.textPrimary} />
          </Pressable>
          <Pressable onPress={() => router.push('/communities')} hitSlop={8}>
            <Ionicons name="people-outline" size={24} color={theme.textPrimary} />
          </Pressable>
          <Pressable onPress={() => router.push('/messages')} hitSlop={8}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[1] }}>
        <SegmentedControl
          segments={[
            { value: 'social', label: 'Sosyal' },
            { value: 'career', label: 'Kariyer' },
          ]}
          value={domain}
          onChange={setDomain}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, i) => (item.type === 'post' ? item.post.id : `item-${i}`)}
        renderItem={({ item }) =>
          item.type === 'post' ? (
            <PostCard
              post={item.post}
              onPress={() => router.push(`/post/${item.post.id}`)}
              onLike={() => toggleLike(item.post.id, !!item.post.likedByMe)}
              onComment={() => router.push(`/post/${item.post.id}`)}
              onAuthorPress={() =>
                item.post.author && router.push(`/u/${item.post.author.username}`)
              }
              onVote={
                item.post.poll
                  ? (optionId) => vote(item.post.id, item.post.poll!.id, optionId)
                  : undefined
              }
              onJoinEvent={item.post.event ? () => join(item.post.id, item.post.event!) : undefined}
              joiningEvent={!!item.post.event && joiningEventId === item.post.event.id}
            />
          ) : item.type === 'ad' ? (
            <AdCard
              campaignId={item.campaignId}
              mediaUrl={item.mediaUrl}
              ctaText={item.ctaText}
              targetUrl={item.targetUrl}
            />
          ) : null
        }
        ListHeaderComponent={
          domain === 'social' ? (
            <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <StoryRing
                stories={storyItems}
                onAddStory={() => router.push('/story/create')}
                onOpenStory={openStory}
              />
              {trendingQuery.data?.items.length ? (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={trendingQuery.data.items}
                  keyExtractor={(t) => t.tag}
                  contentContainerStyle={{ paddingHorizontal: spacing[3], gap: 8, paddingBottom: spacing[2] }}
                  renderItem={({ item: t }) => (
                    <TrendChip
                      tag={t.tag}
                      count={t.usageCount}
                      onPress={() => router.push(`/hashtag/${t.tag}`)}
                    />
                  )}
                />
              ) : null}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={feedQuery.isRefetching} onRefresh={() => feedQuery.refetch()} />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) feedQuery.fetchNextPage();
        }}
        ListEmptyComponent={
          feedQuery.isLoading ? (
            <FeedSkeleton />
          ) : (
            <EmptyState
              icon={domain === 'social' ? 'sparkles-outline' : 'briefcase-outline'}
              title={domain === 'social' ? 'Akış boş' : 'Kariyer akışı boş'}
              description={
                domain === 'social'
                  ? 'İlk gönderiyi sen paylaş veya birini takip et.'
                  : 'Bağlantılarının projeleri ve fırsatlar burada görünür. Reklamsız.'
              }
              actionLabel="Paylaşım yap"
              onAction={() => router.push('/create')}
            />
          )
        }
        contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

function FeedSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing[3], gap: spacing[4] }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Skeleton width={42} height={42} radius={21} />
            <View style={{ gap: 6 }}>
              <Skeleton width={120} height={14} />
              <Skeleton width={80} height={10} />
            </View>
          </View>
          <Skeleton height={14} />
          <Skeleton height={14} width="80%" />
          <Skeleton height={200} radius={14} />
        </View>
      ))}
    </View>
  );
}
