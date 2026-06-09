import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { compactNumber } from '../../src/lib/format.js';
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
        qc.invalidateQueries({ queryKey: ['communities-hub'] }),
        qc.invalidateQueries({ queryKey: ['communities-feed'] }),
        qc.invalidateQueries({ queryKey: ['me'] }),
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
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ['communities'] }),
        qc.invalidateQueries({ queryKey: ['communities-hub'] }),
        qc.invalidateQueries({ queryKey: ['communities-feed'] }),
        qc.invalidateQueries({ queryKey: ['me'] }),
      ]);
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

      <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
        <View style={{ height: 120, backgroundColor: theme.primary + '22' }}>
          {community.coverUrl ? (
            <Image source={{ uri: community.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : null}
        </View>
        <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[3] }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              marginTop: -36,
              backgroundColor: theme.surface2,
              borderWidth: 3,
              borderColor: theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {community.avatarUrl ? (
              <Image source={{ uri: community.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Ionicons name="people" size={34} color={theme.primary} />
            )}
          </View>
          <Text variant="headingMd" style={{ marginTop: spacing[2] }}>
            {community.name}
          </Text>
          {community.category ? (
            <Text variant="caption" tone="brand" weight="600" style={{ marginTop: 2 }}>
              {community.category}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
            <StatBox value={community.memberCount} label="Üye" />
            <View style={{ width: 1, backgroundColor: theme.border }} />
            <StatBox value={community.eventCount ?? 0} label="Etkinlik" />
            <View style={{ width: 1, backgroundColor: theme.border }} />
            <StatBox value={community.totalEventAttendees ?? 0} label="Katılım" />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Badge label={VISIBILITY_LABEL[community.visibility]} tone="info" icon="eye" />
        <Badge label={JOINMODE_LABEL[community.joinMode]} tone="neutral" icon="enter" />
        {community.activeMemberCount != null ? (
          <Badge label={`${compactNumber(community.activeMemberCount)} aktif`} tone="success" icon="ellipse" />
        ) : null}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text weight="700">Kanallar</Text>
            <Text variant="caption" tone="muted">
              {community.channels.length} grup
            </Text>
          </View>
          {community.channels.map((ch) => (
            <Pressable
              key={ch.id}
              onPress={() =>
                router.push({ pathname: `/community/channel/${ch.id}`, params: { name: ch.name, communityId: communityId } })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                backgroundColor: theme.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: ch.isDefault ? theme.primary + '22' : theme.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={ch.isDefault ? 'megaphone' : 'chatbubbles'}
                  size={22}
                  color={ch.isDefault ? theme.primary : theme.textMuted}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text weight="700">{ch.name}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {ch.description ?? (ch.isDefault ? 'Duyurular ve önemli bilgiler' : 'Sohbet kanalı')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text weight="700">Üyeler</Text>
            <Text variant="caption" tone="muted">
              {membersQuery.data.items.length} kişi
            </Text>
          </View>
          {membersQuery.data.items.slice(0, 12).map((m) => (
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

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text variant="headingMd" weight="700">
        {compactNumber(value)}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}
