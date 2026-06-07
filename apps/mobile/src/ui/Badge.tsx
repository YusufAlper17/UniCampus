import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const { theme, radius } = useTheme();
  const colors: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.surface3, fg: theme.textSecondary },
    brand: { bg: theme.primary + '22', fg: theme.primary },
    success: { bg: theme.success + '22', fg: theme.success },
    warning: { bg: theme.warning + '22', fg: theme.warning },
    danger: { bg: theme.danger + '22', fg: theme.danger },
    info: { bg: theme.info + '22', fg: theme.info },
  };
  const c = colors[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: c.bg,
        borderRadius: radius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? <Ionicons name={icon} size={12} color={c.fg} /> : null}
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.fg }}>{label}</Text>
    </View>
  );
}
