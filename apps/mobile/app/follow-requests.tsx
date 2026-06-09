import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../src/ui/Text.js';
import { Avatar } from '../src/ui/Avatar.js';
import { Button } from '../src/ui/Button.js';
import { EmptyState } from '../src/ui/EmptyState.js';
import { useToast } from '../src/ui/Toast.js';
import { useTheme } from '../src/lib/theme.js';
import {
  acceptFollowRequest,
  getFollowRequests,
  rejectFollowRequest,
} from '../src/features/social/api.js';

export default function FollowRequestsScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['follow-requests'],
    queryFn: getFollowRequests,
  });
  const items = data?.items ?? [];

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.show(msg, 'success');
      await qc.invalidateQueries({ queryKey: ['follow-requests'] });
    } catch {
      toast.show('İşlem başarısız', 'error');
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Takip İstekleri', headerShown: true }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing[3], gap: spacing[2], flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading ? null : items.length ? (
          items.map((r) => (
            <View
              key={r.followerId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Pressable onPress={() => router.push(`/u/${r.username}`)}>
                <Avatar uri={r.avatarUrl} name={r.displayName} size={52} />
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/u/${r.username}`)}>
                <Text weight="600">{r.displayName}</Text>
                <Text variant="caption" tone="muted">
                  @{r.username}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  label="Onayla"
                  size="sm"
                  fullWidth={false}
                  onPress={() => act(() => acceptFollowRequest(r.followerId), 'Takip onaylandı')}
                />
                <Button
                  label="Sil"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => act(() => rejectFollowRequest(r.followerId), 'Reddedildi')}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            icon="person-add-outline"
            title="Takip isteği yok"
            description="Seni takip etmek isteyenler burada görünür."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
