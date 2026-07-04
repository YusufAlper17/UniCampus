import { useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { EventData, FeedItem, PollData, StoryGroup } from '@unicampus/shared-types';
import { Wordmark } from '../../src/ui/Wordmark.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { PostCard } from '../../src/ui/PostCard.js';
import { AdCard } from '../../src/ui/AdCard.js';
import { StoryRing } from '../../src/ui/StoryRing.js';
import { IconButton } from '../../src/ui/IconButton.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useTheme } from '../../src/lib/theme.js';
import {
  getFeed,
  likePost,
  unlikePost,
  type FeedPage,
} from '../../src/features/posts/api.js';
import { getFollowRequests } from '../../src/features/social/api.js';
import { votePoll } from '../../src/features/polls/api.js';
import { joinEvent } from '../../src/features/events/api.js';
import { getStories } from '../../src/features/stories/api.js';
import { getConversations } from '../../src/features/messaging/api.js';

export default function HomeFeed() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => getFeed(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: FeedPage) => last.nextCursor,
  });

  const storiesQuery = useQuery({ queryKey: ['stories'], queryFn: getStories });
  const convQuery = useQuery({ queryKey: ['conversations'], queryFn: getConversations });
  const followReqQuery = useQuery({ queryKey: ['follow-requests'], queryFn: getFollowRequests });

  const items: FeedItem[] = feedQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = (convQuery.data?.items ?? []).reduce((s, c) => s + c.unreadCount, 0);
  const followReqCount = followReqQuery.data?.items.length ?? 0;

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
      qc.setQueryData<InfiniteData<FeedPage>>(['feed'], (old) => {
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
    [qc, feedQuery],
  );

  const patchPost = useCallback(
    (postId: string, patch: { poll?: PollData; event?: EventData }) => {
      qc.setQueryData<InfiniteData<FeedPage>>(['feed'], (old) => {
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
    [qc],
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
        <Wordmark size={24} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <IconButton name="play-circle-outline" onPress={() => router.push('/reels')} />
          <IconButton name="heart-outline" badge={followReqCount} onPress={() => router.push('/follow-requests')} />
          <IconButton
            name="chatbubble-ellipses-outline"
            badge={unread}
            onPress={() => router.push('/messages')}
          />
        </View>
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
          <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <StoryRing
              stories={storyItems}
              onAddStory={() => router.push('/story/create')}
              onOpenStory={openStory}
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching}
            onRefresh={() => feedQuery.refetch()}
          />
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
              icon="sparkles-outline"
              title="Akış boş"
              description="İlk gönderiyi sen paylaş veya birini takip et."
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
          <Skeleton height={300} radius={14} />
        </View>
      ))}
    </View>
  );
}
