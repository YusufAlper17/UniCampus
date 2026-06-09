import { FlatList, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../../src/ui/Text.js';
import { EmptyState } from '../../../src/ui/EmptyState.js';
import { Skeleton } from '../../../src/ui/Skeleton.js';
import { UserRow } from '../../../src/ui/UserRow.js';
import { useTheme } from '../../../src/lib/theme.js';
import { getEvent } from '../../../src/features/events/api.js';

export default function EventAttendeesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = String(id);
  const { theme, spacing } = useTheme();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId),
  });

  const event = data?.event;
  const attendees = event?.attendees ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Katılımcılar', headerShown: true }} />
      {isLoading ? (
        <View style={{ padding: spacing[3], gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Skeleton width={46} height={46} radius={23} />
              <Skeleton width={160} height={14} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={attendees}
          keyExtractor={(a) => a.id}
          ListHeaderComponent={
            <View
              style={{
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[3],
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: theme.primary + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text weight="800" tone="brand">
                  {event?.participantCount ?? attendees.length}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="700">{event?.title ?? 'Etkinlik'}</Text>
                <Text variant="caption" tone="muted">
                  {(event?.participantCount ?? attendees.length).toLocaleString('tr-TR')} kişi katılıyor
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <UserRow
              displayName={item.displayName}
              username={item.username ?? ''}
              avatarUrl={item.avatarUrl}
              onPress={() => item.username && router.push(`/u/${item.username}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Katılımcı görünmüyor"
              description="Etkinlik sahibi katılımcı listesini gizlemiş olabilir."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
