import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../src/ui/Text.js';
import { Button } from '../../src/ui/Button.js';
import { IconButton } from '../../src/ui/IconButton.js';
import {
  ProfileHeader,
  ProfileStatsRow,
  ProfileMetaStrip,
  ProfileCommunitiesRow,
  ProfileContentTabs,
  ProfilePostGrid,
  ProfileScreenSkeleton,
  type ProfileContentTab,
} from '../../src/ui/profile/index.js';
import { useTheme } from '../../src/lib/theme.js';
import { useAuthStore } from '../../src/lib/auth-store.js';
import { getMe, getUserPosts } from '../../src/features/users/api.js';
import { getFollowRequests } from '../../src/features/social/api.js';

export default function ProfileTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const [tab, setTab] = useState<ProfileContentTab>('posts');

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const user = data?.user;
  const followReqQuery = useQuery({ queryKey: ['follow-requests'], queryFn: getFollowRequests });

  const postsQuery = useQuery({
    queryKey: ['user-posts', user?.id],
    queryFn: () => getUserPosts(user!.id),
    enabled: !!user,
  });

  const posts = postsQuery.data?.items ?? [];
  const savedPosts = posts.filter((p) => p.savedByMe);
  const followReqCount = followReqQuery.data?.items.length ?? 0;

  function openMenu() {
    Alert.alert('Profil', undefined, [
      { text: 'Fırsatlar', onPress: () => router.push('/deals') },
      { text: 'Ayarlar', onPress: () => router.push('/settings') },
      { text: 'Çıkış yap', style: 'destructive', onPress: () => void signOut() },
      { text: 'İptal', style: 'cancel' },
    ]);
  }

  const academic = data?.academic
    ? {
        faculty: data.academic.faculty,
        department: data.academic.department,
        classYear: data.academic.classYear,
        graduationYear: data.academic.graduationYear,
        gpa: data.academic.gpa != null ? Number(data.academic.gpa) : null,
        studentNo: data.academic.studentNo,
      }
    : null;

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
        <Text variant="headingMd" weight="700">
          Profil
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <IconButton
            name="heart-outline"
            size={24}
            badge={followReqCount}
            onPress={() => router.push('/follow-requests')}
          />
          <IconButton name="ellipsis-horizontal" size={24} onPress={openMenu} />
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: spacing[4] }}
      >
        {isLoading || !user ? (
          <ProfileScreenSkeleton />
        ) : (
          <>
            <ProfileHeader
              displayName={user.displayName}
              username={user.username}
              avatarUrl={user.avatarUrl}
              verified={user.isVerifiedStudent}
              isPrivate={user.accountVisibility === 'private'}
              careerHeadline={user.careerHeadline}
              statusText={user.statusText}
              statusEmoji={user.statusEmoji}
              bio={user.bio}
              footer={
                <>
                  <ProfileStatsRow
                    postCount={user.postCount}
                    followerCount={user.followerCount}
                    followingCount={user.followingCount ?? 0}
                  />
                  {followReqCount > 0 ? (
                    <Pressable onPress={() => router.push('/follow-requests')} style={{ marginTop: spacing[2] }}>
                      <Text variant="caption" tone="brand" weight="600">
                        {followReqCount} takip isteği
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              }
              actions={
                <>
                  <Button label="Profili düzenle" variant="outline" onPress={() => router.push('/edit-profile')} />
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Akademik bilgi"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push('/edit-academic')}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Yakın arkadaşlar"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push('/close-friends')}
                      />
                    </View>
                  </View>
                </>
              }
            />

            <View style={{ paddingHorizontal: spacing[3], gap: spacing[3], marginTop: spacing[3] }}>
              {academic ? <ProfileMetaStrip academic={academic} /> : null}

              <ProfileCommunitiesRow
                communities={data?.featuredCommunities ?? []}
                onPress={(id) => router.push(`/community/${id}`)}
                onEdit={() => router.push('/edit-profile')}
              />
            </View>

            <ProfileContentTabs
              tabs={[
                { id: 'posts', icon: 'grid-outline' },
                { id: 'saved', icon: 'bookmark-outline' },
              ]}
              active={tab}
              onChange={setTab}
            />

            <ProfilePostGrid
              posts={tab === 'saved' ? savedPosts : posts}
              onPostPress={(id) => router.push(`/post/${id}`)}
              emptyTitle={tab === 'saved' ? 'Kaydedilen gönderi yok' : 'Henüz gönderin yok'}
              emptyDescription={
                tab === 'saved'
                  ? 'Beğendiğin gönderileri kaydet, burada görünsün.'
                  : 'İlk gönderini paylaşarak başla.'
              }
              emptyActionLabel={tab === 'posts' ? 'Paylaşım yap' : undefined}
              onEmptyAction={tab === 'posts' ? () => router.push('/create') : undefined}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
