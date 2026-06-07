import { FlatList } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Post } from '@unicampus/shared-types';
import { PostCard } from '../../src/ui/PostCard.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { useTheme } from '../../src/lib/theme.js';
import { api } from '../../src/lib/api.js';

export default function HashtagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const { theme } = useTheme();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['hashtag', tag],
    queryFn: () => api.get<{ items: Post[] }>(`/hashtags/${tag}/posts`),
  });

  const items = data?.items ?? [];

  return (
    <>
      <Stack.Screen options={{ title: `#${tag}`, headerShown: true }} />
      <FlatList
        style={{ flex: 1, backgroundColor: theme.bg }}
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="pricetag-outline" title="Bu etiketle gönderi yok" />
          ) : null
        }
        contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
      />
    </>
  );
}
