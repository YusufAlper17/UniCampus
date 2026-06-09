import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  badge?: number;
  onPress?: () => void;
}

/** Sabit boyutlu, rozet hizalaması bozulmayan başlık ikon butonu. */
export function IconButton({ name, size = 26, color, badge = 0, onPress }: IconButtonProps) {
  const { theme } = useTheme();
  const box = size + 4;
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={name} size={size} color={color ?? theme.textPrimary} />
        {badge > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 17,
              height: 17,
              paddingHorizontal: 4,
              borderRadius: 8.5,
              backgroundColor: theme.danger,
              borderWidth: 1.5,
              borderColor: theme.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 13 }}>
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
