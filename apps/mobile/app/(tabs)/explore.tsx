import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { Post } from '@unicampus/shared-types';
import { Text } from '../../src/ui/Text.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { UserRow } from '../../src/ui/UserRow.js';
import { CommunityCard } from '../../src/ui/CommunityCard.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useTheme } from '../../src/lib/theme.js';
import { compactNumber } from '../../src/lib/format.js';
import { getCommunities } from '../../src/features/communities/api.js';
import {
  getExplore,
  getTrendTopics,
  search,
  type ExplorePage,
  type SearchType,
  type TrendTopic,
} from '../../src/features/search/api.js';

type ExploreTab = 'posts' | 'communities' | 'topics';

const EXPLORE_TABS: { value: ExploreTab; label: string }[] = [
  { value: 'posts', label: 'Keşfet' },
  { value: 'communities', label: 'Topluluklar' },
  { value: 'topics', label: 'Trend Konular' },
];

const FILTERS: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'user', label: 'Kişi' },
  { value: 'hashtag', label: 'Etiket' },
  { value: 'event', label: 'Etkinlik' },
];

function firstMedia(post: Post) {
  if (post.media?.length) return post.media[0];
  if (post.mediaUrls.length) return { type: 'image' as const, url: post.mediaUrls[0] };
  return null;
}

function GridCell({ post, size, onPress }: { post: Post; size: number; onPress: () => void }) {
  const { theme } = useTheme();
  const m = firstMedia(post);
  const multi = (post.media?.length ?? post.mediaUrls.length) > 1;
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size, padding: 1 }}>
      <View style={{ flex: 1, backgroundColor: theme.surface3, overflow: 'hidden' }}>
        {m ? (
          <Image source={{ uri: m.poster ?? m.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
            <Text variant="micro" tone="muted" numberOfLines={4}>
              {post.content}
            </Text>
          </View>
        )}
        {m?.type === 'video' ? (
          <Ionicons name="play" size={18} color="#fff" style={{ position: 'absolute', top: 6, right: 6 }} />
        ) : multi ? (
          <Ionicons name="copy" size={16} color="#fff" style={{ position: 'absolute', top: 6, right: 6 }} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ExploreTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<SearchType>('all');
  const [tab, setTab] = useState<ExploreTab>('posts');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searching = debounced.length >= 1;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: spacing[3], paddingTop: spacing[2], paddingBottom: spacing[1], gap: spacing[2] }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: theme.surface2,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Kişi, etkinlik veya gönderi ara"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            style={{ flex: 1, color: theme.textPrimary, fontSize: 16 }}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {!searching ? (
          <View style={{ flexDirection: 'row' }}>
            {EXPLORE_TABS.map((t) => {
              const active = tab === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setTab(t.value)}
                  style={{ marginRight: spacing[4], paddingVertical: 6 }}
                >
                  <Text
                    weight={active ? '700' : '500'}
                    style={{ color: active ? theme.textPrimary : theme.textMuted, fontSize: 15 }}
                  >
                    {t.label}
                  </Text>
                  <View
                    style={{
                      height: 2,
                      marginTop: 6,
                      borderRadius: 1,
                      backgroundColor: active ? theme.primary : 'transparent',
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {searching ? (
        <SearchResults
          query={debounced}
          filter={filter}
          onFilter={setFilter}
          onUser={(u) => router.push(`/u/${u}`)}
          onHashtag={(t) => router.push(`/hashtag/${t}`)}
          onPost={(id) => router.push(`/post/${id}`)}
        />
      ) : tab === 'posts' ? (
        <PostsExplore />
      ) : tab === 'communities' ? (
        <CommunitiesExplore />
      ) : (
        <TopicsExplore />
      )}
    </SafeAreaView>
  );
}

function SearchResults({
  query,
  filter,
  onFilter,
  onUser,
  onHashtag,
  onPost,
}: {
  query: string;
  filter: SearchType;
  onFilter: (f: SearchType) => void;
  onUser: (username: string) => void;
  onHashtag: (tag: string) => void;
  onPost: (postId: string) => void;
}) {
  const { theme, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const cell = width / 3;
  const { data, isLoading } = useQuery({
    queryKey: ['search', query, filter],
    queryFn: () => search(query, filter),
  });

  const empty =
    !isLoading &&
    data &&
    data.users.length === 0 &&
    data.hashtags.length === 0 &&
    data.events.length === 0 &&
    data.posts.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: spacing[3], paddingVertical: spacing[2], gap: 8 }}
      >
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Pressable
              key={f.value}
              onPress={() => onFilter(f.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? theme.primary : theme.surface2,
              }}
            >
              <Text variant="caption" weight="600" style={{ color: active ? '#fff' : theme.textMuted }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: spacing[3], gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={46} radius={12} />
          ))}
        </View>
      ) : empty ? (
        <EmptyState icon="search-outline" title="Sonuç yok" description={`"${query}" için bir şey bulunamadı.`} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing[5] }}>
          {data?.users.map((u) => (
            <UserRow
              key={u.id}
              displayName={u.displayName}
              username={u.username}
              avatarUrl={u.avatarUrl}
              subtitle={u.careerHeadline}
              verified={u.isVerifiedStudent}
              onPress={() => onUser(u.username)}
            />
          ))}
          {data?.hashtags.map((h) => (
            <Pressable
              key={h.tag}
              onPress={() => onHashtag(h.tag)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing[3] }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: theme.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pricetag" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="600">#{h.tag}</Text>
                <Text variant="caption" tone="muted">
                  {compactNumber(h.usageCount)} gönderi
                </Text>
              </View>
            </Pressable>
          ))}
          {data?.events.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => e.postId && onPost(e.postId)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing[3] }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  backgroundColor: theme.primary + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="calendar" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="600">{e.title}</Text>
                <Text variant="caption" tone="muted">
                  {new Date(e.startsAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                </Text>
              </View>
            </Pressable>
          ))}
          {data?.posts.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {data.posts.map((p) => (
                <GridCell key={p.id} post={p} size={cell} onPress={() => onPost(p.id)} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function PostsExplore() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cell = width / 3;

  const exploreQuery = useInfiniteQuery({
    queryKey: ['explore'],
    queryFn: ({ pageParam }) => getExplore(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: ExplorePage) => last.nextCursor,
  });

  const posts = exploreQuery.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      numColumns={3}
      renderItem={({ item }) => (
        <GridCell post={item} size={cell} onPress={() => router.push(`/post/${item.id}`)} />
      )}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (exploreQuery.hasNextPage && !exploreQuery.isFetchingNextPage) exploreQuery.fetchNextPage();
      }}
      ListEmptyComponent={
        exploreQuery.isLoading ? null : (
          <EmptyState icon="compass-outline" title="Keşfedilecek gönderi yok" description="Yakında yeni içerikler eklenecek." />
        )
      }
      contentContainerStyle={{ paddingBottom: spacing[5], flexGrow: 1 }}
    />
  );
}

function CommunitiesExplore() {
  const { spacing } = useTheme();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['communities', 'trending'],
    queryFn: () => getCommunities({ sort: 'trending' }),
  });

  if (isLoading) {
    return (
      <View style={{ padding: spacing[3], gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={180} radius={16} />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={data?.items ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: spacing[3], gap: 12, flexGrow: 1 }}
      renderItem={({ item, index }) => (
        <CommunityCard
          community={item}
          rank={index + 1}
          onPress={() => router.push(`/community/${item.id}`)}
        />
      )}
      ListEmptyComponent={
        <EmptyState icon="people-outline" title="Topluluk bulunamadı" description="Yeni topluluklar yakında eklenecek." />
      }
    />
  );
}

function TopicsExplore() {
  const { theme, spacing } = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ['trend-topics'], queryFn: getTrendTopics });

  if (isLoading) {
    return (
      <View style={{ padding: spacing[3], gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={100} radius={16} />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={data?.items ?? []}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ padding: spacing[3], gap: 12, flexGrow: 1 }}
      renderItem={({ item }) => <TopicCard topic={item} />}
      ListEmptyComponent={<EmptyState icon="flame-outline" title="Trend konu yok" description="Yakında güncellenecek." />}
    />
  );
}

function TopicCard({ topic }: { topic: TrendTopic }) {
  const { theme, spacing, radius } = useTheme();
  const icon = (topic.icon || 'flame') as keyof typeof Ionicons.glyphMap;

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: spacing[3],
        gap: spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#FF6A3D22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={22} color="#FF6A3D" />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="700">{topic.title}</Text>
          <Text variant="caption" tone="muted">
            {compactNumber(topic.postCount)} gönderi · {compactNumber(topic.participantCount)} katılımcı
          </Text>
        </View>
        <Ionicons name="trending-up" size={20} color={theme.primary} />
      </View>
      <Text variant="caption" tone="secondary">
        {topic.description}
      </Text>
    </View>
  );
}
