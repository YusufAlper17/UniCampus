import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CommunityChannel, InviteLink } from '@unicampus/shared-types';
import { compactNumber } from '../../src/lib/format.js';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { JoinButton } from '../../src/ui/JoinButton.js';
import { PostCard } from '../../src/ui/PostCard.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { InviteLinkSheet } from '../../src/ui/InviteLinkSheet.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { ApiError } from '../../src/lib/api.js';
import {
  approveRequest,
  createInvite,
  getCommunity,
  getCommunityPosts,
  getMembers,
  getRequests,
  joinCommunity,
  leaveCommunity,
  rejectRequest,
} from '../../src/features/communities/api.js';

type CommunityTab = 'messages' | 'feed';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} g`;
}

export default function CommunityDetailScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const communityId = String(id);
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<InviteLink | null>(null);
  const [tab, setTab] = useState<CommunityTab>(tabParam === 'feed' ? 'feed' : 'messages');

  const { data, isLoading, refetch, isRefetching } = useQuery({
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

  const postsQuery = useQuery({
    queryKey: ['community-posts', communityId],
    queryFn: () => getCommunityPosts(communityId),
    enabled: isActive && tab === 'feed',
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
      await Promise.all([requestsQuery.refetch(), membersQuery.refetch(), refetch()]);
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

  function openMenu() {
    const options: Parameters<typeof Alert.alert>[2] = [];
    if (isManager) options!.push({ text: 'Davet linki oluştur', onPress: () => void onCreateInvite() });
    if (isActive && !isManager)
      options!.push({ text: 'Topluluktan ayrıl', style: 'destructive', onPress: () => void onLeave() });
    options!.push({ text: 'İptal', style: 'cancel' });
    Alert.alert(community?.name ?? 'Topluluk', undefined, options);
  }

  if (isLoading || !community) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Screen options={{ title: '', headerShown: true }} />
        <Skeleton height={110} radius={0} />
        <View style={{ padding: spacing[3], gap: 14 }}>
          <Skeleton width={72} height={72} radius={20} style={{ marginTop: -48 }} />
          <Skeleton height={20} width="60%" />
          <Skeleton height={14} width="90%" />
          <Skeleton height={44} radius={12} />
          <Skeleton height={64} radius={12} />
          <Skeleton height={64} radius={12} />
        </View>
      </View>
    );
  }

  const members = membersQuery.data?.items ?? [];
  const requests = requestsQuery.data?.items ?? [];
  const channels = [...(community.channels ?? [])].sort(
    (a, b) =>
      new Date(b.lastMessage?.createdAt ?? 0).getTime() - new Date(a.lastMessage?.createdAt ?? 0).getTime(),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      contentContainerStyle={{ paddingBottom: spacing[5] }}
    >
      <Stack.Screen
        options={{
          title: community.name,
          headerShown: true,
          headerRight: () =>
            isActive ? (
              <Pressable onPress={openMenu} hitSlop={8}>
                <Ionicons name="ellipsis-horizontal" size={22} color={theme.textPrimary} />
              </Pressable>
            ) : null,
        }}
      />

      {/* Kapak + kimlik */}
      <View style={{ height: 110, backgroundColor: theme.primary + '14' }}>
        {community.coverUrl ? (
          <Image source={{ uri: community.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: spacing[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing[3] }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              marginTop: -38,
              backgroundColor: theme.surface2,
              borderWidth: 3,
              borderColor: theme.bg,
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
          <View style={{ flex: 1, paddingBottom: 2 }}>
            <Text variant="headingMd" weight="700" numberOfLines={1}>
              {community.name}
            </Text>
            {community.category ? (
              <Text variant="caption" tone="muted">
                {community.category}
              </Text>
            ) : null}
          </View>
        </View>

        {community.description ? (
          <Text variant="caption" tone="secondary" numberOfLines={2} style={{ marginTop: spacing[2], lineHeight: 19 }}>
            {community.description}
          </Text>
        ) : null}

        {/* İstatistikler */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing[3], paddingVertical: 4 }}>
          <StatCell value={community.memberCount} label="Üye" />
          <View style={{ width: 1, height: 26, backgroundColor: theme.border }} />
          <StatCell value={community.eventCount ?? 0} label="Etkinlik" />
          <View style={{ width: 1, height: 26, backgroundColor: theme.border }} />
          <StatCell value={community.totalEventAttendees ?? 0} label="Katılım" />
        </View>

        {/* Üyeler — avatar yığını */}
        {isActive && members.length ? (
          <Pressable
            onPress={() => router.push(`/community/members/${communityId}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[2],
              marginTop: spacing[2],
              paddingVertical: spacing[2],
            }}
          >
            <View style={{ flexDirection: 'row' }}>
              {members.slice(0, 5).map((m, i) => (
                <View
                  key={m.userId}
                  style={{
                    marginLeft: i === 0 ? 0 : -10,
                    borderWidth: 2,
                    borderColor: theme.bg,
                    borderRadius: 16,
                  }}
                >
                  <Avatar uri={m.avatarUrl} name={m.displayName ?? m.username} size={28} />
                </View>
              ))}
            </View>
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              <Text variant="caption" weight="700">
                {compactNumber(community.memberCount)}
              </Text>{' '}
              üye
            </Text>
            <Text variant="caption" tone="brand" weight="600">
              Tümünü gör
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.primary} />
          </Pressable>
        ) : null}

        {/* Üye değilse katılım */}
        {!isActive ? (
          <View style={{ marginTop: spacing[3] }}>
            <JoinButton
              status={(community.viewerStatus as 'none' | 'pending' | 'active') ?? 'none'}
              joinMode={community.joinMode}
              onJoin={onJoin}
              onLeave={onLeave}
              loading={busy}
            />
          </View>
        ) : null}
      </View>

      {isActive ? (
        <>
          {/* Sekmeler */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: spacing[3],
              marginTop: spacing[2],
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            {(
              [
                { id: 'messages', label: 'Mesajlar' },
                { id: 'feed', label: 'Akış' },
              ] as { id: CommunityTab; label: string }[]
            ).map((t) => {
              const active = tab === t.id;
              return (
                <Pressable key={t.id} onPress={() => setTab(t.id)} style={{ marginRight: spacing[4], paddingVertical: 10 }}>
                  <Text weight={active ? '700' : '500'} style={{ color: active ? theme.textPrimary : theme.textMuted, fontSize: 15 }}>
                    {t.label}
                  </Text>
                  <View
                    style={{
                      height: 2,
                      marginTop: 8,
                      marginBottom: -1,
                      borderRadius: 1,
                      backgroundColor: active ? theme.primary : 'transparent',
                    }}
                  />
                </Pressable>
              );
            })}
          </View>

          {tab === 'messages' ? (
            <View>
              {/* Yönetici: üyelik istekleri */}
              {isManager && requests.length ? (
                <View style={{ paddingHorizontal: spacing[3], paddingTop: spacing[3], gap: spacing[2] }}>
                  <Text variant="micro" tone="muted" weight="700" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Üyelik istekleri ({requests.length})
                  </Text>
                  {requests.map((r) => (
                    <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Avatar uri={r.avatarUrl} name={r.displayName} size={38} />
                      <View style={{ flex: 1 }}>
                        <Text weight="600" numberOfLines={1}>
                          {r.displayName}
                        </Text>
                        <Text variant="micro" tone="muted">
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

              {invite ? (
                <View style={{ paddingHorizontal: spacing[3], paddingTop: spacing[3] }}>
                  <InviteLinkSheet invite={invite} />
                </View>
              ) : null}

              {/* WhatsApp tarzı kanal listesi */}
              {channels.length ? (
                channels.map((ch, i) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    last={i === channels.length - 1}
                    onPress={() =>
                      router.push({
                        pathname: `/community/channel/${ch.id}`,
                        params: { name: ch.name, communityId },
                      })
                    }
                  />
                ))
              ) : (
                <EmptyState icon="chatbubbles-outline" title="Henüz kanal yok" description="İlk kanalı yönetici oluşturur." />
              )}
            </View>
          ) : (
            <View style={{ paddingTop: spacing[1] }}>
              {postsQuery.isLoading ? (
                <View style={{ padding: spacing[3], gap: 12 }}>
                  <Skeleton height={220} radius={12} />
                  <Skeleton height={220} radius={12} />
                </View>
              ) : postsQuery.data?.items.length ? (
                postsQuery.data.items.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPress={() => router.push(`/post/${post.id}`)}
                    onAuthorPress={() => post.author && router.push(`/u/${post.author.username}`)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="newspaper-outline"
                  title="Akış boş"
                  description="Topluluk üyeleri paylaşım yaptıkça burada görünür."
                />
              )}
            </View>
          )}
        </>
      ) : (
        <View style={{ paddingHorizontal: spacing[3], marginTop: spacing[4], alignItems: 'center', gap: 8 }}>
          <Ionicons name="lock-closed-outline" size={28} color={theme.textMuted} />
          <Text variant="caption" tone="muted" center>
            Mesajlar ve akış yalnızca üyelere açık.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ChannelRow({
  channel,
  last,
  onPress,
}: {
  channel: CommunityChannel;
  last: boolean;
  onPress: () => void;
}) {
  const { theme, spacing } = useTheme();
  const unread = channel.unreadCount ?? 0;
  const preview = channel.lastMessage;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingHorizontal: spacing[3],
        paddingVertical: 12,
        backgroundColor: pressed ? theme.surface2 : 'transparent',
      })}
    >
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: channel.isDefault ? theme.primary + '18' : theme.surface3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={channel.isDefault ? 'megaphone' : 'chatbubbles'}
          size={22}
          color={channel.isDefault ? theme.primary : theme.textMuted}
        />
      </View>

      <View style={{ flex: 1, gap: 2, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border, paddingBottom: last ? 0 : 12, marginBottom: last ? 0 : -12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text weight={unread > 0 ? '700' : '600'} numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>
            {channel.name}
          </Text>
          {preview ? (
            <Text variant="micro" weight={unread > 0 ? '700' : '500'} style={{ color: unread > 0 ? theme.primary : theme.textMuted }}>
              {timeAgo(preview.createdAt)}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            variant="caption"
            tone={unread > 0 ? 'secondary' : 'muted'}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {preview
              ? `${preview.senderName ? `${preview.senderName}: ` : ''}${preview.content}`
              : channel.description ?? (channel.isDefault ? 'Duyurular ve önemli bilgiler' : 'Sohbet kanalı')}
          </Text>
          {unread > 0 ? (
            <View
              style={{
                minWidth: 20,
                height: 20,
                paddingHorizontal: 6,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text weight="700" variant="headingMd">
        {compactNumber(value)}
      </Text>
      <Text variant="micro" tone="muted">
        {label}
      </Text>
    </View>
  );
}
