import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

export interface MilestoneEntity {
  id: string;
  title: string;
  description?: string | null;
  occurredOn?: string | null;
}

interface MilestoneCardProps {
  milestone: MilestoneEntity;
  congratsCount?: number;
  congratulatedByMe?: boolean;
  onCongrats?: () => void;
}

export function MilestoneCard({ milestone, congratsCount, congratulatedByMe, onCongrats }: MilestoneCardProps) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing[3] }}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: theme.success + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="trophy" size={16} color={theme.success} />
        </View>
        <View style={{ flex: 1, width: 2, backgroundColor: theme.border, marginTop: 4 }} />
      </View>
      <View style={{ flex: 1, paddingBottom: spacing[3], gap: 2 }}>
        <Text weight="600">{milestone.title}</Text>
        {milestone.description ? <Text tone="secondary">{milestone.description}</Text> : null}
        {milestone.occurredOn ? (
          <Text variant="micro" tone="muted">
            {new Date(milestone.occurredOn).toLocaleDateString('tr-TR')}
          </Text>
        ) : null}
        {onCongrats ? (
          <Pressable
            onPress={onCongrats}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start' }}
          >
            <Ionicons
              name={congratulatedByMe ? 'hand-left' : 'hand-left-outline'}
              size={18}
              color={congratulatedByMe ? theme.primary : theme.textMuted}
            />
            <Text variant="caption" tone={congratulatedByMe ? 'brand' : 'muted'}>
              Tebrik et{congratsCount ? ` · ${congratsCount}` : ''}
            </Text>
          </Pressable>
        ) : congratsCount ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Ionicons name="hand-left" size={16} color={theme.textMuted} />
            <Text variant="caption" tone="muted">
              {congratsCount} tebrik
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
