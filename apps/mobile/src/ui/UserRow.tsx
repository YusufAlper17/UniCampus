import { Pressable, View } from 'react-native';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Avatar } from './Avatar.js';

interface UserRowProps {
  displayName: string;
  username: string;
  avatarUrl?: string;
  subtitle?: string;
  verified?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
}

export function UserRow({
  displayName,
  username,
  avatarUrl,
  subtitle,
  verified,
  onPress,
  right,
}: UserRowProps) {
  const { spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: 10,
        paddingHorizontal: spacing[3],
      }}
    >
      <Avatar uri={avatarUrl} name={displayName} size={46} verified={verified} />
      <View style={{ flex: 1 }}>
        <Text weight="600">{displayName}</Text>
        <Text variant="caption" tone="muted">
          @{username}
          {subtitle ? ` · ${subtitle}` : ''}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}
