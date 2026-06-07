import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../src/ui/Screen.js';
import { Text } from '../src/ui/Text.js';
import { Avatar } from '../src/ui/Avatar.js';
import { Button } from '../src/ui/Button.js';
import { EmptyState } from '../src/ui/EmptyState.js';
import { useToast } from '../src/ui/Toast.js';
import { useTheme } from '../src/lib/theme.js';
import { getCloseFriends, removeCloseFriend } from '../src/features/stories/api.js';

export default function CloseFriendsScreen() {
  const { spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['close-friends'], queryFn: getCloseFriends });
  const items = data?.items ?? [];

  async function remove(userId: string) {
    try {
      await removeCloseFriend(userId);
      await qc.invalidateQueries({ queryKey: ['close-friends'] });
      toast.show('Listeden çıkarıldı', 'success');
    } catch {
      toast.show('İşlem başarısız', 'error');
    }
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Yakın Arkadaşlar' }} />
      <View style={{ gap: spacing[3] }}>
        <Text variant="headingLg">Yakın Arkadaşlar</Text>
        <Text tone="muted">
          Yalnızca yakın arkadaşlarına özel story paylaşabilirsin. Eklemek için bir profile gidip yıldıza dokun.
        </Text>

        {isLoading ? null : items.length ? (
          items.map((f) => (
            <View key={f.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar uri={f.avatarUrl ?? null} name={f.displayName} size={48} />
              <View style={{ flex: 1 }}>
                <Text weight="600">{f.displayName}</Text>
                <Text variant="caption" tone="muted">
                  @{f.username}
                </Text>
              </View>
              <Button label="Çıkar" size="sm" variant="secondary" fullWidth={false} onPress={() => remove(f.userId)} />
            </View>
          ))
        ) : (
          <EmptyState
            icon="star-outline"
            title="Liste boş"
            description="Bir profile gidip yıldıza dokunarak yakın arkadaş ekle."
          />
        )}
      </View>
    </Screen>
  );
}
