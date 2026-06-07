import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth = true,
  icon,
  style,
}: ButtonProps) {
  const { theme, radius } = useTheme();
  const isDisabled = disabled || loading;

  const heights: Record<Size, number> = { sm: 38, md: 48, lg: 56 };
  const fontSizes: Record<Size, number> = { sm: 14, md: 16, lg: 17 };

  const bg: Record<Variant, string> = {
    primary: theme.primary,
    secondary: theme.surface2,
    outline: 'transparent',
    ghost: 'transparent',
    danger: theme.danger,
  };
  const fg: Record<Variant, string> = {
    primary: theme.onPrimary,
    secondary: theme.textPrimary,
    outline: theme.primary,
    ghost: theme.primary,
    danger: '#FFFFFF',
  };

  function handlePress() {
    if (isDisabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        {
          height: heights[size],
          borderRadius: radius.md,
          backgroundColor: bg[variant],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 20,
          width: fullWidth ? '100%' : undefined,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: theme.primary,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text style={{ color: fg[variant], fontSize: fontSizes[size], fontWeight: '600' }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
