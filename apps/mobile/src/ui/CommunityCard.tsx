import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
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

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={13} color={theme.textMuted} />
      <Text variant="caption" weight="600">
        {compactNumber(value)}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export function CommunityCard({
  community,
  onPress,
  rank,
  horizontal,
}: {
  community: Community;
  onPress?: () => void;
  rank?: number;
  horizontal?: boolean;
}) {
  const { theme, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: horizontal ? 264 : undefined,
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: 84, backgroundColor: theme.primary + '22' }}>
        {community.coverUrl ? (
          <Image source={{ uri: community.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : null}
        {rank != null ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              minWidth: 26,
              height: 26,
              paddingHorizontal: 6,
              borderRadius: 8,
              backgroundColor: 'rgba(0,0,0,0.6)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="caption" weight="700" style={{ color: '#fff' }}>
              #{rank}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing[3], paddingTop: spacing[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: -34 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.md,
              backgroundColor: theme.surface2,
              borderWidth: 2,
              borderColor: theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {community.avatarUrl ? (
              <Image source={{ uri: community.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Ionicons name="people" size={24} color={theme.primary} />
            )}
          </View>
          {community.category ? (
            <View
              style={{
                marginTop: 30,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: theme.primary + '18',
              }}
            >
              <Text variant="micro" weight="600" tone="brand">
                {community.category}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing[2] }}>
          <Text weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
            {community.name}
          </Text>
          <Ionicons name={VISIBILITY_ICON[community.visibility]} size={12} color={theme.textMuted} />
        </View>

        {community.description ? (
          <Text variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
            {community.description}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[2] }}>
          <Stat icon="people" value={community.memberCount} label="üye" />
          {community.eventCount != null ? <Stat icon="calendar" value={community.eventCount} label="etkinlik" /> : null}
          {community.totalEventAttendees != null ? (
            <Stat icon="ticket" value={community.totalEventAttendees} label="katılım" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
