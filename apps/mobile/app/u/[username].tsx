import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { FollowButton, type FollowState } from '../../src/ui/FollowButton.js';
import { ProjectCard } from '../../src/ui/ProjectCard.js';
import { MilestoneCard } from '../../src/ui/MilestoneCard.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { getProfile, getUserPosts } from '../../src/features/users/api.js';
import { congratulateMilestone, getUserMilestones, getUserProjects } from '../../src/features/career/api.js';
import { followUser, unfollowUser } from '../../src/features/social/api.js';
import { addCloseFriend, getCloseFriends, removeCloseFriend } from '../../src/features/stories/api.js';
import { createConversation } from '../../src/features/messaging/api.js';

const ACCOUNT_TYPE_LABEL: Record<string, string | undefined> = {
  club: 'Kulüp hesabı',
  team: 'Takım hesabı',
};

export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { theme, spacing, radius } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ProfileContentTab>('posts');
  const [followState, setFollowState] = useState<FollowState>('none');
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getProfile(username),
  });

  const user = data?.user;

  const postsQuery = useQuery({
    queryKey: ['user-posts', user?.id],
    queryFn: () => getUserPosts(user!.id),
    enabled: !!user,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: () => getUserProjects(user!.id),
    enabled: !!user,
  });

  const milestonesQuery = useQuery({
    queryKey: ['milestones', user?.id],
    queryFn: () => getUserMilestones(user!.id),
    enabled: !!user,
  });

  const closeFriendsQuery = useQuery({ queryKey: ['close-friends'], queryFn: getCloseFriends });
  const isCloseFriend = !!user && (closeFriendsQuery.data?.items.some((f) => f.userId === user.id) ?? false);

  const posts = postsQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];
  const milestones = milestonesQuery.data?.items ?? [];
  const hasProjectsTab = projects.length > 0 || milestones.length > 0;

  async function congrats(id: string) {
    if (!user) return;
    try {
      await congratulateMilestone(id);
      await qc.invalidateQueries({ queryKey: ['milestones', user.id] });
    } catch {
      toast.show('İşlem başarısız', 'error');
    }
  }

  async function toggleCloseFriend() {
    if (!user) return;
    try {
      if (isCloseFriend) {
        await removeCloseFriend(user.id);
        toast.show('Yakın arkadaşlardan çıkarıldı', 'success');
      } else {
        await addCloseFriend(user.id);
        toast.show('Yakın arkadaş eklendi', 'success');
      }
      await qc.invalidateQueries({ queryKey: ['close-friends'] });
    } catch {
      toast.show('İşlem başarısız', 'error');
    }
  }

  async function onFollow() {
    if (!user) return;
    setBusy(true);
    try {
      if (followState === 'none') {
        const res = await followUser(user.id);
        setFollowState(res.status === 'pending' ? 'requested' : 'following');
      } else {
        await unfollowUser(user.id);
        setFollowState('none');
      }
    } catch {
      toast.show('İşlem başarısız', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onMessage() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const res = await createConversation({ type: 'dm', memberIds: [user.id] });
      router.push(`/chat/${res.conversation.id}`);
    } catch {
      toast.show('Sohbet açılamadı', 'error');
    } finally {
      setBusy(false);
    }
  }

  const iconBtn = (icon: keyof typeof Ionicons.glyphMap, onPress: () => void, active?: boolean) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? theme.success : theme.border,
        backgroundColor: active ? theme.success + '18' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={20} color={active ? theme.success : theme.textPrimary} />
    </Pressable>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      contentContainerStyle={{ paddingBottom: spacing[4] }}
    >
      <Stack.Screen options={{ title: user ? user.displayName : '', headerShown: true }} />

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
            subtitle={ACCOUNT_TYPE_LABEL[user.type]}
            footer={
              <ProfileStatsRow
                postCount={user.postCount}
                followerCount={user.followerCount}
                followingCount={user.followingCount ?? 0}
              />
            }
            actions={
              <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <FollowButton state={followState} onPress={onFollow} loading={busy} />
                </View>
                {iconBtn('chatbubble-outline', onMessage)}
                {iconBtn(isCloseFriend ? 'star' : 'star-outline', toggleCloseFriend, isCloseFriend)}
              </View>
            }
          />

          <View style={{ paddingHorizontal: spacing[3], gap: spacing[3], marginTop: spacing[3] }}>
            {data?.academic ? <ProfileMetaStrip academic={data.academic} /> : null}

            {data?.featuredCommunities?.length ? (
              <ProfileCommunitiesRow
                communities={data.featuredCommunities}
                onPress={(id) => router.push(`/community/${id}`)}
              />
            ) : null}
          </View>

          <ProfileContentTabs
            tabs={
              hasProjectsTab
                ? [
                    { id: 'posts', icon: 'grid-outline' },
                    { id: 'projects', icon: 'briefcase-outline' },
                  ]
                : [{ id: 'posts', icon: 'grid-outline' }]
            }
            active={tab}
            onChange={setTab}
          />

          {tab === 'posts' ? (
            <ProfilePostGrid
              posts={posts}
              onPostPress={(id) => router.push(`/post/${id}`)}
              emptyTitle="Henüz gönderi yok"
              emptyDescription="Bu kullanıcı henüz paylaşım yapmamış."
            />
          ) : (
            <View style={{ paddingHorizontal: spacing[3], gap: spacing[3], paddingTop: spacing[3] }}>
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onPress={() => router.push(`/project/${p.id}`)} />
              ))}
              {milestones.map((m) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  congratsCount={m.congratsCount}
                  congratulatedByMe={m.congratulatedByMe}
                  onCongrats={() => congrats(m.id)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
