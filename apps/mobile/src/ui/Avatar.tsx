import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  verified?: boolean;
  ring?: boolean;
}

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ uri, name, size = 44, verified, ring }: AvatarProps) {
  const { theme } = useTheme();
  return (
    <View>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.surface3,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: ring ? 2 : 0,
          borderColor: theme.primary,
          overflow: 'hidden',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
        ) : (
          <Text style={{ fontSize: size * 0.38, fontWeight: '600', color: theme.textSecondary }}>
            {initials(name)}
          </Text>
        )}
      </View>
      {verified ? (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            backgroundColor: theme.bg,
            borderRadius: 10,
          }}
        >
          <Ionicons name="checkmark-circle" size={size * 0.34} color={theme.info} />
        </View>
      ) : null}
    </View>
  );
}
