import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Community } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { compactNumber } from '../lib/format.js';

const VISIBILITY_ICON: Record<Community['visibility'], keyof typeof Ionicons.glyphMap> = {
  public: 'earth',
  unlisted: 'link',
  private: 'lock-closed',
};

export function CommunityCard({ community, onPress }: { community: Community; onPress?: () => void }) {
  const { theme, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[3],
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: radius.md,
          backgroundColor: theme.primary + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="people" size={26} color={theme.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="600" numberOfLines={1}>
          {community.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={VISIBILITY_ICON[community.visibility]} size={12} color={theme.textMuted} />
          <Text variant="caption" tone="muted">
            {compactNumber(community.memberCount)} üye
          </Text>
          {community.category ? (
            <>
              <Text variant="caption" tone="muted">
                ·
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {community.category}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}
