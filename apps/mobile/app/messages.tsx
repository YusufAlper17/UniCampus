import { FlatList, RefreshControl, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../src/ui/EmptyState.js';
import { ConversationListItem } from '../src/ui/ConversationListItem.js';
import { Skeleton } from '../src/ui/Skeleton.js';
import { useTheme } from '../src/lib/theme.js';
import { getConversations } from '../src/features/messaging/api.js';

export default function Messages() {
  const { theme, spacing } = useTheme();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 12000,
  });

  const items = data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Mesajlar', headerShown: true }} />
      {isLoading ? (
        <View style={{ padding: spacing[3], gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Skeleton width={52} height={52} radius={26} />
              <View style={{ gap: 6, flex: 1 }}>
                <Skeleton width="50%" height={14} />
                <Skeleton width="80%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ConversationListItem conversation={item} onPress={() => router.push(`/chat/${item.id}`)} />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 76 }} />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Henüz mesaj yok"
              description="Bir profile gidip mesaj göndererek sohbet başlat."
            />
          }
          contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : { paddingVertical: spacing[1] }}
        />
      )}
    </View>
  );
}
