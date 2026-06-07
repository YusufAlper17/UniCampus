import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { Button } from '../../src/ui/Button.js';
import { Badge } from '../../src/ui/Badge.js';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import {
  acceptConnection,
  acceptFollowRequest,
  getConnectionRequests,
  getConnectionSuggestions,
  getFollowRequests,
  rejectConnection,
  rejectFollowRequest,
  requestConnection,
} from '../../src/features/social/api.js';

type Kind = 'follow' | 'connect';

export default function ActivityTab() {
  const { theme, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('follow');
  const [requested, setRequested] = useState<Record<string, boolean>>({});

  const followQ = useQuery({ queryKey: ['follow-requests'], queryFn: getFollowRequests });
  const connectQ = useQuery({ queryKey: ['connection-requests'], queryFn: getConnectionRequests });
  const suggestQ = useQuery({
    queryKey: ['connection-suggestions'],
    queryFn: getConnectionSuggestions,
    enabled: kind === 'connect',
  });

  async function connect(userId: string) {
    setRequested((s) => ({ ...s, [userId]: true }));
    try {
      await requestConnection(userId);
      toast.show('Bağlantı isteği gönderildi', 'success');
    } catch {
      setRequested((s) => ({ ...s, [userId]: false }));
      toast.show('İstek gönderilemedi', 'error');
    }
  }

  async function act(fn: () => Promise<unknown>, successMsg: string, invalidate: string) {
    try {
      await fn();
      toast.show(successMsg, 'success');
      void qc.invalidateQueries({ queryKey: [invalidate] });
    } catch {
      toast.show('İşlem başarısız', 'error');
    }
  }

  const refreshing = followQ.isRefetching || connectQ.isRefetching;
  const followItems = followQ.data?.items ?? [];
  const connectItems = connectQ.data?.items ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: spacing[3], gap: spacing[3] }}>
        <Text variant="headingMd">Etkinlik</Text>
        <SegmentedControl
          segments={[
            { value: 'follow', label: `Takip (${followItems.length})` },
            { value: 'connect', label: `Bağlantı (${connectItems.length})` },
          ]}
          value={kind}
          onChange={setKind}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing[3], gap: spacing[2], flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void followQ.refetch();
              void connectQ.refetch();
            }}
          />
        }
      >
        {kind === 'follow' ? (
          followItems.length ? (
            followItems.map((r) => (
              <RequestRow
                key={r.followerId}
                name={r.displayName}
                username={r.username}
                avatarUrl={r.avatarUrl}
                onAccept={() =>
                  act(() => acceptFollowRequest(r.followerId), 'Takip onaylandı', 'follow-requests')
                }
                onReject={() =>
                  act(() => rejectFollowRequest(r.followerId), 'Reddedildi', 'follow-requests')
                }
              />
            ))
          ) : (
            <EmptyState icon="person-add-outline" title="Takip isteği yok" description="Yeni istekler burada görünür." />
          )
        ) : (
          <>
            {connectItems.length ? (
              <>
                <Text variant="caption" tone="muted" style={{ marginTop: spacing[1] }}>
                  Bekleyen istekler
                </Text>
                {connectItems.map((r) => (
                  <RequestRow
                    key={r.id}
                    name={r.displayName}
                    username={r.username}
                    subtitle={r.careerHeadline ?? undefined}
                    avatarUrl={r.avatarUrl}
                    onAccept={() => act(() => acceptConnection(r.id), 'Bağlantı kuruldu', 'connection-requests')}
                    onReject={() => act(() => rejectConnection(r.id), 'Reddedildi', 'connection-requests')}
                  />
                ))}
              </>
            ) : null}

            {suggestQ.data?.items.length ? (
              <View style={{ gap: spacing[2], marginTop: connectItems.length ? spacing[3] : 0 }}>
                <Text variant="caption" tone="muted">
                  Tanıyor olabileceğin kişiler
                </Text>
                {suggestQ.data.items.map((s) => (
                  <View
                    key={s.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
                  >
                    <Pressable onPress={() => router.push(`/u/${s.username}`)}>
                      <Avatar uri={s.avatarUrl ?? null} name={s.displayName} size={48} />
                    </Pressable>
                    <Pressable style={{ flex: 1 }} onPress={() => router.push(`/u/${s.username}`)}>
                      <Text weight="600">{s.displayName}</Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {s.careerHeadline ?? `@${s.username}`}
                      </Text>
                      <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                        <Badge label={s.reason} tone="info" />
                      </View>
                    </Pressable>
                    <Button
                      label={requested[s.id] ? 'İstendi' : 'Bağlan'}
                      size="sm"
                      fullWidth={false}
                      disabled={requested[s.id]}
                      variant={requested[s.id] ? 'secondary' : 'primary'}
                      onPress={() => connect(s.id)}
                    />
                  </View>
                ))}
              </View>
            ) : !connectItems.length ? (
              <EmptyState
                icon="git-network-outline"
                title="Bağlantı isteği yok"
                description="Yeni bağlantı istekleri ve öneriler burada görünür."
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RequestRow({
  name,
  username,
  subtitle,
  avatarUrl,
  onAccept,
  onReject,
}: {
  name: string;
  username: string;
  subtitle?: string;
  avatarUrl: string | null;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <Avatar uri={avatarUrl} name={name} size={48} />
      <View style={{ flex: 1 }}>
        <Text weight="600">{name}</Text>
        <Text variant="caption" tone="muted">
          {subtitle ?? `@${username}`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Onayla" size="sm" fullWidth={false} onPress={onAccept} />
        <Button label="Sil" size="sm" variant="secondary" fullWidth={false} onPress={onReject} />
      </View>
    </View>
  );
}
