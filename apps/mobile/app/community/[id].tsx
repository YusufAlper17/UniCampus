import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { Badge } from '../../src/ui/Badge.js';
import { Button } from '../../src/ui/Button.js';
import { JoinButton } from '../../src/ui/JoinButton.js';
import { MemberRoleBadge } from '../../src/ui/MemberRoleBadge.js';
import { InviteLinkSheet } from '../../src/ui/InviteLinkSheet.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { ApiError } from '../../src/lib/api.js';
import {
  approveRequest,
  createInvite,
  getCommunity,
  getMembers,
  getRequests,
  joinCommunity,
  leaveCommunity,
  rejectRequest,
} from '../../src/features/communities/api.js';
import type { InviteLink } from '@unicampus/shared-types';

const VISIBILITY_LABEL = { public: 'Açık', unlisted: 'Link', private: 'Gizli' } as const;
const JOINMODE_LABEL = { open: 'Herkese açık', request: 'İstekle', invite: 'Davetle' } as const;

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityId = String(id);
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<InviteLink | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['community', communityId],
    queryFn: () => getCommunity(communityId),
  });
  const community = data?.community;
  const isActive = community?.viewerStatus === 'active';
  const isManager = community?.viewerRole === 'owner' || community?.viewerRole === 'admin';

  const membersQuery = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: () => getMembers(communityId),
    enabled: isActive,
  });

  const requestsQuery = useQuery({
    queryKey: ['community-requests', communityId],
    queryFn: () => getRequests(communityId),
    enabled: !!isManager,
  });

  async function onJoin() {
    setBusy(true);
    try {
      const { status } = await joinCommunity(communityId);
      toast.show(status === 'pending' ? 'Katılma isteği gönderildi' : 'Katıldın', 'success');
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ['communities'] }),
      ]);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'İşlem başarısız', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    setBusy(true);
    try {
      await leaveCommunity(communityId);
      toast.show('Topluluktan ayrıldın', 'success');
      await Promise.all([refetch(), qc.invalidateQueries({ queryKey: ['communities'] })]);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'İşlem başarısız', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(userId: string) {
    try {
      await approveRequest(communityId, userId);
      await Promise.all([
        requestsQuery.refetch(),
        membersQuery.refetch(),
        refetch(),
      ]);
    } catch {
      toast.show('Onaylanamadı', 'error');
    }
  }

  async function onReject(userId: string) {
    try {
      await rejectRequest(communityId, userId);
      await requestsQuery.refetch();
    } catch {
      toast.show('Reddedilemedi', 'error');
    }
  }

  async function onCreateInvite() {
    try {
      const { invite: link } = await createInvite(communityId, { expiresInDays: 7 });
      setInvite(link);
    } catch {
      toast.show('Davet oluşturulamadı', 'error');
    }
  }

  if (isLoading || !community) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: spacing[3], gap: 16 }}>
        <Stack.Screen options={{ title: '', headerShown: true }} />
        <Skeleton height={80} radius={16} />
        <Skeleton height={48} radius={12} />
        <Skeleton height={120} radius={12} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}
    >
      <Stack.Screen options={{ title: community.name, headerShown: true }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: theme.primary + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="people" size={32} color={theme.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="headingMd">{community.name}</Text>
          <Text variant="caption" tone="muted">
            {community.memberCount} üye
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Badge label={VISIBILITY_LABEL[community.visibility]} tone="info" icon="eye" />
        <Badge label={JOINMODE_LABEL[community.joinMode]} tone="neutral" icon="enter" />
      </View>

      {community.description ? <Text tone="secondary">{community.description}</Text> : null}

      <JoinButton
        status={(community.viewerStatus as 'none' | 'pending' | 'active') ?? 'none'}
        joinMode={community.joinMode}
        onJoin={onJoin}
        onLeave={onLeave}
        loading={busy}
      />

      {isActive && community.channels?.length ? (
        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" tone="muted">
            Kanallar
          </Text>
          {community.channels.map((ch) => (
            <Pressable
              key={ch.id}
              onPress={() =>
                router.push({ pathname: `/community/channel/${ch.id}`, params: { name: ch.name } })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: theme.surface2,
                borderRadius: 12,
              }}
            >
              <Ionicons name="chatbox-ellipses-outline" size={18} color={theme.textMuted} />
              <Text weight="600" style={{ flex: 1 }}>
                {ch.name}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {isManager ? (
        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" tone="muted">
            Davet
          </Text>
          {invite ? (
            <InviteLinkSheet invite={invite} />
          ) : (
            <Button
              label="Davet Linki Oluştur"
              variant="secondary"
              icon={<Ionicons name="link" size={18} color={theme.textPrimary} />}
              onPress={onCreateInvite}
            />
          )}
        </View>
      ) : null}

      {isManager && requestsQuery.data?.items.length ? (
        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" tone="muted">
            Üyelik İstekleri ({requestsQuery.data.items.length})
          </Text>
          {requestsQuery.data.items.map((r) => (
            <View
              key={r.userId}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
            >
              <Avatar uri={r.avatarUrl} name={r.displayName} size={40} />
              <View style={{ flex: 1 }}>
                <Text weight="600" numberOfLines={1}>
                  {r.displayName}
                </Text>
                <Text variant="caption" tone="muted">
                  @{r.username}
                </Text>
              </View>
              <Pressable onPress={() => onApprove(r.userId)} hitSlop={6}>
                <Ionicons name="checkmark-circle" size={28} color={theme.success} />
              </Pressable>
              <Pressable onPress={() => onReject(r.userId)} hitSlop={6}>
                <Ionicons name="close-circle" size={28} color={theme.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {isActive && membersQuery.data?.items.length ? (
        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" tone="muted">
            Üyeler ({membersQuery.data.items.length})
          </Text>
          {membersQuery.data.items.map((m) => (
            <Pressable
              key={m.userId}
              onPress={() => m.username && router.push(`/u/${m.username}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
            >
              <Avatar uri={m.avatarUrl} name={m.displayName} size={40} />
              <View style={{ flex: 1 }}>
                <Text weight="600" numberOfLines={1}>
                  {m.displayName ?? m.username}
                </Text>
                <Text variant="caption" tone="muted">
                  @{m.username}
                </Text>
              </View>
              <MemberRoleBadge role={m.role} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
