import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Button } from './Button.js';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'sparkles-outline', title, description, actionLabel, onAction }: EmptyStateProps) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing[5], gap: 10, flex: 1 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: theme.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={34} color={theme.textMuted} />
      </View>
      <Text variant="headingMd" center>
        {title}
      </Text>
      {description ? (
        <Text tone="muted" center>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: 8 }}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}
