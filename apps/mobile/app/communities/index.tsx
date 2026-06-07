import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { Community } from '@unicampus/shared-types';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { CommunityCard } from '../../src/ui/CommunityCard.js';
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

  const discover = useInfiniteQuery({
    queryKey: ['communities', 'discover'],
    queryFn: ({ pageParam }) => getCommunities({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: CommunityPage) => last.nextCursor,
    enabled: tab === 'discover',
  });

  const mine = useQuery({
    queryKey: ['communities', 'mine'],
    queryFn: () => getCommunities({ mine: true }),
    enabled: tab === 'mine',
  });

  const items: Community[] =
    tab === 'discover'
      ? (discover.data?.pages.flatMap((p) => p.items) ?? [])
      : (mine.data?.items ?? []);
  const loading = tab === 'discover' ? discover.isLoading : mine.isLoading;
  const refreshing = tab === 'discover' ? discover.isRefetching : mine.isRefetching;

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
      <View style={{ padding: spacing[3] }}>
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
        <View style={{ paddingHorizontal: spacing[3], gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={76} radius={16} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CommunityCard community={item} onPress={() => router.push(`/community/${item.id}`)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ padding: spacing[3], paddingTop: 0, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => (tab === 'discover' ? discover.refetch() : mine.refetch())}
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
              title={tab === 'discover' ? 'Henüz topluluk yok' : 'Topluluğun yok'}
              description={
                tab === 'discover'
                  ? 'İlk topluluğu sen oluştur.'
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
