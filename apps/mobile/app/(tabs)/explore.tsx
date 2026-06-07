import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ContentDomain } from '@unicampus/shared-types';
import { Text } from '../../src/ui/Text.js';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { PostCard } from '../../src/ui/PostCard.js';
import { TrendChip } from '../../src/ui/TrendChip.js';
import { UserRow } from '../../src/ui/UserRow.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useTheme } from '../../src/lib/theme.js';
import { compactNumber } from '../../src/lib/format.js';
import { getExplore, search, type ExplorePage, type SearchType } from '../../src/features/search/api.js';

const FILTERS: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'user', label: 'Kişi' },
  { value: 'hashtag', label: 'Etiket' },
  { value: 'event', label: 'Etkinlik' },
];

export default function ExploreTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const [domain, setDomain] = useState<ContentDomain>('social');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<SearchType>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searching = debounced.length >= 1;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: spacing[3], paddingTop: spacing[2], gap: spacing[2] }}>
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
            placeholder="Kişi, etiket veya etkinlik ara"
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
      ) : (
        <ExploreContent domain={domain} onDomain={setDomain} />
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
  const { data, isLoading } = useQuery({
    queryKey: ['search', query, filter],
    queryFn: () => search(query, filter),
  });

  const empty =
    !isLoading &&
    data &&
    data.users.length === 0 &&
    data.hashtags.length === 0 &&
    data.events.length === 0;

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
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Skeleton width={46} height={46} radius={23} />
              <View style={{ gap: 6 }}>
                <Skeleton width={140} height={14} />
                <Skeleton width={90} height={10} />
              </View>
            </View>
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
        </ScrollView>
      )}
    </View>
  );
}

function ExploreContent({
  domain,
  onDomain,
}: {
  domain: ContentDomain;
  onDomain: (d: ContentDomain) => void;
}) {
  const { theme, spacing } = useTheme();
  const router = useRouter();

  const exploreQuery = useInfiniteQuery({
    queryKey: ['explore', domain],
    queryFn: ({ pageParam }) => getExplore(domain, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: ExplorePage) => last.nextCursor,
  });

  const first = exploreQuery.data?.pages[0];
  const posts = exploreQuery.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onPress={() => router.push(`/post/${item.id}`)}
          onAuthorPress={() => item.author && router.push(`/u/${item.author.username}`)}
        />
      )}
      ListHeaderComponent={
        <View>
          <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[2] }}>
            <SegmentedControl
              segments={[
                { value: 'social', label: 'Sosyal' },
                { value: 'career', label: 'Kariyer' },
              ]}
              value={domain}
              onChange={onDomain}
            />
          </View>

          {first?.suggestedUsers.length ? (
            <View style={{ paddingBottom: spacing[2] }}>
              <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing[3], marginBottom: 8 }}>
                Önerilen hesaplar
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing[3], gap: 12 }}
              >
                {first.suggestedUsers.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => router.push(`/u/${u.username}`)}
                    style={{
                      alignItems: 'center',
                      width: 96,
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      gap: 6,
                    }}
                  >
                    <Avatar uri={u.avatarUrl} name={u.displayName} size={56} verified={u.isVerifiedStudent} />
                    <Text variant="caption" weight="600" numberOfLines={1} style={{ maxWidth: 80 }}>
                      {u.displayName}
                    </Text>
                    <Text variant="micro" tone="muted" numberOfLines={1} style={{ maxWidth: 80 }}>
                      @{u.username}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {domain === 'social' && first?.trending.length ? (
            <View style={{ paddingBottom: spacing[2] }}>
              <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing[3], marginBottom: 8 }}>
                Trendler
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing[3], gap: 8 }}
              >
                {first.trending.map((t) => (
                  <TrendChip key={t.tag} tag={t.tag} count={t.usageCount} onPress={() => router.push(`/hashtag/${t.tag}`)} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {posts.length ? (
            <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing[3], marginBottom: 4 }}>
              Keşfet
            </Text>
          ) : null}
        </View>
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (exploreQuery.hasNextPage && !exploreQuery.isFetchingNextPage) exploreQuery.fetchNextPage();
      }}
      ListEmptyComponent={
        exploreQuery.isLoading ? null : (
          <EmptyState
            icon={domain === 'social' ? 'compass-outline' : 'briefcase-outline'}
            title="Keşfedilecek içerik yok"
            description="Daha fazla kişiyi takip ettikçe burası dolacak."
          />
        )
      }
    />
  );
}
