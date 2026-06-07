import { Pressable } from 'react-native';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { compactNumber } from '../lib/format.js';

interface TrendChipProps {
  tag: string;
  count?: number;
  onPress?: () => void;
}

export function TrendChip({ tag, count, onPress }: TrendChipProps) {
  const { theme, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: theme.surface2,
        borderRadius: radius.full,
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text weight="600" tone="brand">
        #{tag}
      </Text>
      {count != null && count > 0 ? (
        <Text variant="micro" tone="muted">
          {compactNumber(count)}
        </Text>
      ) : null}
    </Pressable>
  );
}
