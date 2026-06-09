import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { Badge } from '../../src/ui/Badge.js';
import { FollowButton, type FollowState } from '../../src/ui/FollowButton.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { ProjectCard } from '../../src/ui/ProjectCard.js';
import { MilestoneCard } from '../../src/ui/MilestoneCard.js';
import { ProfileAcademicGrid } from '../../src/ui/ProfileAcademicGrid.js';
import { ProfileCommunities } from '../../src/ui/ProfileCommunities.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { getProfile } from '../../src/features/users/api.js';
import { congratulateMilestone, getUserMilestones, getUserProjects } from '../../src/features/career/api.js';
import { followUser, unfollowUser } from '../../src/features/social/api.js';
import { addCloseFriend, getCloseFriends, removeCloseFriend } from '../../src/features/stories/api.js';
import { createConversation } from '../../src/features/messaging/api.js';

const ACCOUNT_TYPE_BADGE: Record<string, { label: string; icon: 'people' | 'shield' } | undefined> = {
  club: { label: 'Kulüp', icon: 'people' },
  team: { label: 'Takım', icon: 'shield' },
};

export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { theme, spacing } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getProfile(username),
  });

  const [followState, setFollowState] = useState<FollowState>('none');
  const [busy, setBusy] = useState(false);

  const user = data?.user;

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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}>
      <Stack.Screen options={{ title: user ? `@${user.username}` : '', headerShown: true }} />
      {isLoading || !user ? (
        <View style={{ gap: 16 }}>
          <Skeleton width={84} height={84} radius={42} />
          <Skeleton height={18} width="50%" />
          <Skeleton height={14} width="70%" />
        </View>
      ) : (
        <>
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
              {ACCOUNT_TYPE_BADGE[user.type] ? (
                <Badge
                  label={ACCOUNT_TYPE_BADGE[user.type]!.label}
                  tone="info"
                  icon={ACCOUNT_TYPE_BADGE[user.type]!.icon}
                />
              ) : null}
            </View>
            {user.careerHeadline ? <Badge label={user.careerHeadline} tone="brand" icon="briefcase" /> : null}
            {user.statusText ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {user.statusEmoji ? <Text>{user.statusEmoji}</Text> : null}
                <Text tone="secondary">{user.statusText}</Text>
              </View>
            ) : null}
            {user.bio ? <Text tone="secondary">{user.bio}</Text> : null}
          </View>

          {data?.academic ? <ProfileAcademicGrid academic={data.academic} /> : null}

          {data?.featuredCommunities?.length ? (
            <ProfileCommunities
              communities={data.featuredCommunities}
              onPress={(id) => router.push(`/community/${id}`)}
            />
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <FollowButton state={followState} onPress={onFollow} loading={busy} />
            <Pressable
              onPress={onMessage}
              disabled={busy}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={theme.textPrimary} />
            </Pressable>
            <Pressable
              onPress={toggleCloseFriend}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isCloseFriend ? theme.success : theme.border,
                backgroundColor: isCloseFriend ? theme.success + '18' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={isCloseFriend ? 'star' : 'star-outline'}
                size={20}
                color={isCloseFriend ? theme.success : theme.textPrimary}
              />
            </Pressable>
          </View>

          {projectsQuery.data?.items.length ? (
            <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
              <Text variant="caption" tone="muted">
                Projeler
              </Text>
              {projectsQuery.data.items.map((p) => (
                <ProjectCard key={p.id} project={p} onPress={() => router.push(`/project/${p.id}`)} />
              ))}
            </View>
          ) : null}

          {milestonesQuery.data?.items.length ? (
            <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
              <Text variant="caption" tone="muted">
                Kilometre Taşları
              </Text>
              {milestonesQuery.data.items.map((m) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  congratsCount={m.congratsCount}
                  congratulatedByMe={m.congratulatedByMe}
                  onCongrats={() => congrats(m.id)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
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
