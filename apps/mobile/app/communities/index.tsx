import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { Community } from '@unicampus/shared-types';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { CommunityCard } from '../../src/ui/CommunityCard.js';
import { Text } from '../../src/ui/Text.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useTheme } from '../../src/lib/theme.js';
import { getCommunities } from '../../src/features/communities/api.js';

type Tab = 'discover' | 'mine';

interface CommunityPage {
  items: Community[];
  nextCursor: string | null;
}

export default function CommunitiesScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('discover');
  const [category, setCategory] = useState('all');

  const trending = useQuery({
    queryKey: ['communities', 'trending'],
    queryFn: () => getCommunities({ sort: 'trending' }),
    enabled: tab === 'discover',
  });

  const discover = useInfiniteQuery({
    queryKey: ['communities', 'discover', category],
    queryFn: ({ pageParam }) => getCommunities({ cursor: pageParam, category }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: CommunityPage) => last.nextCursor,
    enabled: tab === 'discover',
  });

  const mine = useQuery({
    queryKey: ['communities', 'mine'],
    queryFn: () => getCommunities({ mine: true }),
    enabled: tab === 'mine',
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of trending.data?.items ?? []) if (c.category) set.add(c.category);
    return ['all', ...Array.from(set)];
  }, [trending.data?.items]);

  const items: Community[] =
    tab === 'discover'
      ? (discover.data?.pages.flatMap((p) => p.items) ?? [])
      : (mine.data?.items ?? []);
  const loading = tab === 'discover' ? discover.isLoading : mine.isLoading;
  const refreshing = tab === 'discover' ? discover.isRefetching : mine.isRefetching;
  const topTrending = (trending.data?.items ?? []).slice(0, 6);

  const Header =
    tab === 'discover' ? (
      <View style={{ gap: spacing[3], marginBottom: spacing[3] }}>
        {topTrending.length ? (
          <View style={{ gap: spacing[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flame" size={18} color="#FF6A3D" />
              <Text weight="700">Trend topluluklar</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing[2], paddingRight: spacing[1] }}
            >
              {topTrending.map((c, i) => (
                <CommunityCard
                  key={c.id}
                  community={c}
                  rank={i + 1}
                  horizontal
                  onPress={() => router.push(`/community/${c.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {categories.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing[2] }}
          >
            {categories.map((cat) => {
              const active = cat === category;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? theme.primary : theme.surface2,
                  }}
                >
                  <Text variant="caption" weight="600" style={{ color: active ? '#fff' : theme.textMuted }}>
                    {cat === 'all' ? 'Tümü' : cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <Text weight="700">Tüm topluluklar</Text>
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen
        options={{
          title: 'Topluluklar',
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={() => router.push('/community/create')} hitSlop={8}>
              <Ionicons name="add-circle" size={26} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      <View style={{ padding: spacing[3], paddingBottom: 0 }}>
        <SegmentedControl<Tab>
          segments={[
            { value: 'discover', label: 'Keşfet' },
            { value: 'mine', label: 'Topluluklarım' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {loading ? (
        <View style={{ padding: spacing[3], gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={180} radius={16} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CommunityCard community={item} onPress={() => router.push(`/community/${item.id}`)} />
          )}
          ListHeaderComponent={Header}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ padding: spacing[3], flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                if (tab === 'discover') {
                  void discover.refetch();
                  void trending.refetch();
                } else {
                  void mine.refetch();
                }
              }}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (tab === 'discover' && discover.hasNextPage && !discover.isFetchingNextPage) {
              void discover.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={tab === 'discover' ? 'Topluluk bulunamadı' : 'Topluluğun yok'}
              description={
                tab === 'discover'
                  ? 'Bu kategoride topluluk yok. Başka bir kategori dene.'
                  : 'Keşfet sekmesinden topluluklara katıl veya yeni bir tane oluştur.'
              }
              actionLabel="Topluluk Oluştur"
              onAction={() => router.push('/community/create')}
            />
          }
        />
      )}
    </View>
  );
}
