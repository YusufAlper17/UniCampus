import { View } from 'react-native';
import { useTheme } from '../lib/theme.js';

interface StepIndicatorProps {
  total: number;
  current: number;
}

export function StepIndicator({ total, current }: StepIndicatorProps) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i <= current;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: active ? theme.primary : theme.border,
            }}
          />
        );
      })}
    </View>
  );
}
