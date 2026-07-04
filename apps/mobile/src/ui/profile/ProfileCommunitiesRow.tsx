import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { FeaturedCommunity } from '../../features/users/api.js';
import { useTheme } from '../../lib/theme.js';
import { Text } from '../Text.js';

export function ProfileCommunitiesRow({
  communities,
  onPress,
  onEdit,
}: {
  communities: FeaturedCommunity[];
  onPress?: (id: string) => void;
  onEdit?: () => void;
}) {
  const { theme, spacing } = useTheme();
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[3] }}>
          {communities.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onPress?.(c.id)}
              style={{ width: 72, alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  overflow: 'hidden',
                  backgroundColor: theme.surface3,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.avatarUrl ? (
                  <Image source={{ uri: c.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Ionicons name="people" size={20} color={theme.textMuted} />
                )}
              </View>
              <Text variant="micro" weight="600" numberOfLines={2} center style={{ width: 72 }}>
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
