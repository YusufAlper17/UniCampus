import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Dual feed sekme geçişi (Sosyal | Kariyer) ve genel segment kontrolü.
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surface2,
        borderRadius: radius.full,
        padding: 4,
        gap: 4,
      }}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(s.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.full,
              backgroundColor: active ? theme.primary : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontWeight: '600',
                color: active ? theme.onPrimary : theme.textMuted,
              }}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
