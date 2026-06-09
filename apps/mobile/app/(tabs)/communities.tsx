import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../src/ui/Text.js';
import { PostCard } from '../../src/ui/PostCard.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useTheme } from '../../src/lib/theme.js';
import { getMyCommunitiesFeed, getMyCommunitiesHub } from '../../src/features/communities/api.js';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} g`;
}

export default function CommunitiesTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();

  const hubQuery = useQuery({ queryKey: ['communities-hub'], queryFn: getMyCommunitiesHub });
  const feedQuery = useQuery({ queryKey: ['communities-feed'], queryFn: getMyCommunitiesFeed });

  const items = hubQuery.data?.items ?? [];
  const posts = feedQuery.data?.items ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text variant="headingMd">Topluluklarım</Text>
        <Pressable onPress={() => router.push('/community/create')} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={26} color={theme.primary} />
        </Pressable>
      </View>

      {hubQuery.isLoading ? (
        <View style={{ padding: spacing[3], gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={72} radius={0} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.community.id}
          refreshControl={
            <RefreshControl
              refreshing={hubQuery.isRefetching || feedQuery.isRefetching}
              onRefresh={() => {
                void hubQuery.refetch();
                void feedQuery.refetch();
              }}
            />
          }
          ListHeaderComponent={
            items.length ? (
              <Text
                variant="micro"
                tone="muted"
                weight="700"
                style={{ paddingHorizontal: spacing[3], paddingTop: spacing[2], paddingBottom: spacing[1], textTransform: 'uppercase', letterSpacing: 0.4 }}
              >
                Topluluklarım
              </Text>
            ) : null
          }
          ListFooterComponent={
            posts.length ? (
              <View style={{ paddingTop: spacing[3], paddingBottom: spacing[2] }}>
                <Text
                  variant="micro"
                  tone="muted"
                  weight="700"
                  style={{ paddingHorizontal: spacing[3], marginBottom: spacing[2], textTransform: 'uppercase', letterSpacing: 0.4 }}
                >
                  Topluluk akışı
                </Text>
                {posts.slice(0, 4).map((item) => (
                  <PostCard
                    key={item.post.id}
                    post={item.post}
                    onPress={() => router.push(`/post/${item.post.id}`)}
                    onAuthorPress={() =>
                      item.post.author && router.push(`/u/${item.post.author.username}`)
                    }
                  />
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const c = item.community;
            const preview = item.lastMessage;
            return (
              <Pressable
                onPress={() => router.push(`/community/${c.id}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[3],
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <View style={{ position: 'relative' }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: theme.primary + '22',
                    }}
                  >
                    {c.avatarUrl ? (
                      <Image source={{ uri: c.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="people" size={26} color={theme.primary} />
                      </View>
                    )}
                  </View>
                  {item.unreadCount > 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: 20,
                        height: 20,
                        paddingHorizontal: 5,
                        borderRadius: 10,
                        backgroundColor: theme.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text weight="700" numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>
                      {c.name}
                    </Text>
                    {preview ? (
                      <Text variant="micro" tone="muted">
                        {timeAgo(preview.createdAt)}
                      </Text>
                    ) : null}
                  </View>
                  {preview ? (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      <Text variant="caption" tone="brand" weight="600">
                        #{preview.channelName}
                      </Text>
                      {' · '}
                      {preview.senderName ? `${preview.senderName}: ` : ''}
                      {preview.content}
                    </Text>
                  ) : (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {c.memberCount.toLocaleString('tr-TR')} üye · Kanallara dokun
                    </Text>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Henüz topluluğun yok"
              description="Keşfet sekmesinden topluluklara katıl."
              actionLabel="Topluluk Keşfet"
              onAction={() => router.push('/(tabs)/explore')}
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </SafeAreaView>
  );
}
