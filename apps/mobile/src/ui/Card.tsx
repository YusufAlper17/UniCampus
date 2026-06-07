import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme.js';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ children, style, elevated, padded = true }: CardProps) {
  const { theme, radius, spacing } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderWidth: elevated ? 0 : 1,
          borderColor: theme.border,
          padding: padded ? spacing[3] : 0,
        },
        elevated
          ? {
              shadowColor: theme.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
