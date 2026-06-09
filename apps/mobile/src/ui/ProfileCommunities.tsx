import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { FeaturedCommunity } from '../features/users/api.js';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

export function ProfileCommunities({
  communities,
  onPress,
  onEdit,
}: {
  communities: FeaturedCommunity[];
  onPress?: (id: string) => void;
  onEdit?: () => void;
}) {
  const { theme, spacing, radius } = useTheme();
  if (!communities.length && !onEdit) return null;

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="caption" tone="muted">
          Topluluklar
        </Text>
        {onEdit ? (
          <Pressable onPress={onEdit} hitSlop={8}>
            <Text variant="caption" tone="brand" weight="600">
              Düzenle
            </Text>
          </Pressable>
        ) : null}
      </View>
      {communities.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
          {communities.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onPress?.(c.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: radius.full,
                backgroundColor: theme.surface2,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: theme.primary + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.avatarUrl ? (
                  <Image source={{ uri: c.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Ionicons name="people" size={14} color={theme.primary} />
                )}
              </View>
              <Text variant="caption" weight="600" numberOfLines={1} style={{ maxWidth: 120 }}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text variant="caption" tone="muted">
          Profilinde göstermek için topluluk seç.
        </Text>
      )}
    </View>
  );
}
