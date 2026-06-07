import { useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Text } from '../../src/ui/Text.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useTheme } from '../../src/lib/theme.js';
import { clickDeal, getDeals, revealDeal, type DealListItem } from '../../src/features/deals/api.js';

const CATEGORIES = ['Tümü', 'Yeme', 'Teknoloji', 'Giyim', 'Eğlence'];

export default function DealsScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const [category, setCategory] = useState('Tümü');
  const catParam = category === 'Tümü' ? undefined : category;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['deals', catParam],
    queryFn: () => getDeals(catParam),
  });

  async function reveal(item: DealListItem) {
    try {
      const res = await revealDeal(item.id);
      if (res.sponsorUrl) void Linking.openURL(res.sponsorUrl);
      alert(`Kodun: ${res.discountCode}`);
    } catch {
      alert('Kod alınamadı');
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          gap: spacing[2],
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text variant="headingMd">İndirimler & Fırsatlar</Text>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing[3], gap: 8, paddingBottom: spacing[2] }}
        renderItem={({ item: c }) => (
          <Pressable
            onPress={() => setCategory(c)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: category === c ? theme.primary : theme.surface,
              borderWidth: 1,
              borderColor: category === c ? theme.primary : theme.border,
            }}
          >
            <Text variant="caption" style={{ color: category === c ? '#FFF' : theme.textSecondary }}>
              {c}
            </Text>
          </Pressable>
        )}
      />

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(d) => d.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ padding: spacing[3], gap: spacing[3], flexGrow: 1 }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: spacing[3] }}>
              <Skeleton height={120} radius={12} />
              <Skeleton height={120} radius={12} />
            </View>
          ) : (
            <EmptyState
              icon="pricetag-outline"
              title="Kampanya yok"
              description="Şu an aktif indirim bulunmuyor."
            />
          )
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 14,
              padding: spacing[3],
              gap: spacing[2],
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {item.logoUrl ? (
                <Image source={{ uri: item.logoUrl }} style={{ width: 40, height: 40, borderRadius: 8 }} />
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: theme.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="storefront" size={20} color={theme.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text variant="body">{item.title}</Text>
                {item.brandName ? (
                  <Text variant="caption" tone="muted">
                    {item.brandName}
                  </Text>
                ) : null}
              </View>
              {item.discountValue ? (
                <Text variant="body" style={{ color: theme.primary, fontWeight: '600' }}>
                  {item.discountValue}
                </Text>
              ) : null}
            </View>
            {item.description ? (
              <Text variant="caption" tone="secondary">
                {item.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Pressable
                onPress={() => void reveal(item)}
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text variant="caption" style={{ color: '#FFF', fontWeight: '600' }}>
                  Kodu Gör
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void clickDeal(item.id).then((r) => r.url && Linking.openURL(r.url))}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="open-outline" size={18} color={theme.textPrimary} />
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
