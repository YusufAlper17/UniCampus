import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { Post } from '@unicampus/shared-types';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { Button } from '../../src/ui/Button.js';
import { IconButton } from '../../src/ui/IconButton.js';
import { Badge } from '../../src/ui/Badge.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { ProfileAcademicGrid } from '../../src/ui/ProfileAcademicGrid.js';
import { ProfileCommunities } from '../../src/ui/ProfileCommunities.js';
import { useTheme } from '../../src/lib/theme.js';
import { useAuthStore } from '../../src/lib/auth-store.js';
import { getMe, getUserPosts } from '../../src/features/users/api.js';
import { getFollowRequests } from '../../src/features/social/api.js';
import { SafeAreaView } from 'react-native-safe-area-context';

function firstMedia(post: Post) {
  if (post.media?.length) return post.media[0];
  if (post.mediaUrls.length) return { type: 'image' as const, url: post.mediaUrls[0] };
  return null;
}

export default function ProfileTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const signOut = useAuthStore((s) => s.signOut);
  const cell = (width - spacing[3] * 2 - 4) / 3;

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const user = data?.user;
  const followReqQuery = useQuery({ queryKey: ['follow-requests'], queryFn: getFollowRequests });

  const postsQuery = useQuery({
    queryKey: ['user-posts', user?.id],
    queryFn: () => getUserPosts(user!.id),
    enabled: !!user,
  });
  const posts = postsQuery.data?.items ?? [];
  const followReqCount = followReqQuery.data?.items.length ?? 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
        }}
      >
        <Text variant="headingMd">{user ? `@${user.username}` : 'Profil'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <IconButton
            name="heart-outline"
            size={24}
            badge={followReqCount}
            onPress={() => router.push('/follow-requests')}
          />
          <IconButton name="pricetag-outline" size={24} onPress={() => router.push('/deals')} />
          <IconButton name="settings-outline" size={24} onPress={() => router.push('/settings')} />
          <IconButton name="log-out-outline" size={24} onPress={() => void signOut()} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading || !user ? (
          <ProfileSkeleton />
        ) : (
          <>
            {followReqCount > 0 ? (
              <Pressable
                onPress={() => router.push('/follow-requests')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: spacing[3],
                  borderRadius: 14,
                  backgroundColor: theme.primary + '12',
                  borderWidth: 1,
                  borderColor: theme.primary + '33',
                }}
              >
                <Ionicons name="person-add" size={22} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text weight="600">Takip istekleri</Text>
                  <Text variant="caption" tone="muted">
                    {followReqCount} kişi seni takip etmek istiyor
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <Avatar uri={user.avatarUrl} name={user.displayName} size={84} verified={user.isVerifiedStudent} />
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
                <Stat label="Gönderi" value={user.postCount} />
                <Stat label="Takipçi" value={user.followerCount} />
                <Stat label="Takip" value={user.followingCount ?? 0} />
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="headingMd">{user.displayName}</Text>
                {user.accountVisibility === 'private' ? (
                  <Ionicons name="lock-closed" size={14} color={theme.textMuted} />
                ) : null}
              </View>
              {user.careerHeadline ? <Badge label={user.careerHeadline} tone="brand" icon="school" /> : null}
              {user.statusText ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {user.statusEmoji ? <Text>{user.statusEmoji}</Text> : null}
                  <Text tone="secondary">{user.statusText}</Text>
                </View>
              ) : null}
              {user.bio ? <Text tone="secondary">{user.bio}</Text> : null}
            </View>

            {data?.academic ? (
              <ProfileAcademicGrid
                academic={{
                  faculty: data.academic.faculty,
                  department: data.academic.department,
                  classYear: data.academic.classYear,
                  graduationYear: data.academic.graduationYear,
                  gpa: data.academic.gpa != null ? Number(data.academic.gpa) : null,
                  studentNo: data.academic.studentNo,
                }}
              />
            ) : null}

            <ProfileCommunities
              communities={data?.featuredCommunities ?? []}
              onPress={(id) => router.push(`/community/${id}`)}
              onEdit={() => router.push('/edit-profile')}
            />

            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <View style={{ flex: 1 }}>
                <Button label="Profili Düzenle" variant="secondary" onPress={() => router.push('/edit-profile')} />
              </View>
              <Button
                label=""
                variant="secondary"
                fullWidth={false}
                icon={<Ionicons name="school-outline" size={18} color={theme.textPrimary} />}
                onPress={() => router.push('/edit-academic')}
              />
              <Button
                label=""
                variant="secondary"
                fullWidth={false}
                icon={<Ionicons name="star-outline" size={18} color={theme.textPrimary} />}
                onPress={() => router.push('/close-friends')}
              />
            </View>

            <View style={{ height: 1, backgroundColor: theme.border, marginTop: spacing[1] }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="grid" size={16} color={theme.textPrimary} />
              <Text weight="700" variant="caption">
                GÖNDERİLER
              </Text>
            </View>

            {posts.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
                {posts.map((p) => {
                  const m = firstMedia(p);
                  return (
                    <Pressable key={p.id} onPress={() => router.push(`/post/${p.id}`)} style={{ width: cell, height: cell }}>
                      <View style={{ flex: 1, backgroundColor: theme.surface3, overflow: 'hidden', borderRadius: 4 }}>
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
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                icon="images-outline"
                title="Henüz gönderin yok"
                description="İlk gönderini paylaşarak başla."
                actionLabel="Paylaşım yap"
                onAction={() => router.push('/create')}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="headingMd">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Skeleton width={84} height={84} radius={42} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={20} />
          <Skeleton height={14} width="60%" />
        </View>
      </View>
      <Skeleton height={48} radius={12} />
      <Skeleton height={40} radius={999} />
    </View>
  );
}
