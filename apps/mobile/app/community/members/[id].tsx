import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../../src/ui/Text.js';
import { UserRow } from '../../../src/ui/UserRow.js';
import { MemberRoleBadge } from '../../../src/ui/MemberRoleBadge.js';
import { Input } from '../../../src/ui/Input.js';
import { Skeleton } from '../../../src/ui/Skeleton.js';
import { EmptyState } from '../../../src/ui/EmptyState.js';
import { useTheme } from '../../../src/lib/theme.js';
import { getMembers } from '../../../src/features/communities/api.js';

export default function CommunityMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityId = String(id);
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: () => getMembers(communityId),
  });

  const members = useMemo(() => {
    const items = data?.items ?? [];
    const roleOrder = { owner: 0, admin: 1, moderator: 2, member: 3 } as Record<string, number>;
    const sorted = [...items].sort(
      (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9),
    );
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (m) =>
        (m.displayName ?? '').toLowerCase().includes(q) || (m.username ?? '').toLowerCase().includes(q),
    );
  }, [data?.items, query]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Üyeler', headerShown: true }} />
      {isLoading ? (
        <View style={{ padding: spacing[3], gap: 14 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Skeleton width={44} height={44} radius={22} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton height={13} width="50%" />
                <Skeleton height={11} width="30%" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.userId}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ paddingHorizontal: spacing[3], paddingTop: spacing[2], paddingBottom: spacing[1], gap: spacing[2] }}>
              <Input placeholder="Üye ara" value={query} onChangeText={setQuery} autoCapitalize="none" />
              <Text variant="micro" tone="muted">
                {members.length} üye
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <UserRow
              displayName={item.displayName ?? item.username ?? ''}
              username={item.username ?? ''}
              avatarUrl={item.avatarUrl}
              onPress={() => item.username && router.push(`/u/${item.username}`)}
              right={<MemberRoleBadge role={item.role} />}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="Üye bulunamadı" description="Aramanla eşleşen üye yok." />
          }
          contentContainerStyle={{ paddingBottom: spacing[4], flexGrow: 1 }}
        />
      )}
    </SafeAreaView>
  );
}
