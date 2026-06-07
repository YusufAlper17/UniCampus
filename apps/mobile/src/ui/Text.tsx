import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../lib/theme.js';

type Variant = 'headingXl' | 'headingLg' | 'headingMd' | 'body' | 'caption' | 'micro';
type Tone = 'primary' | 'secondary' | 'muted' | 'inverse' | 'brand' | 'danger' | 'success';

interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
}

export function Text({
  variant = 'body',
  tone = 'primary',
  weight,
  center,
  style,
  ...rest
}: TextProps) {
  const { theme, typography } = useTheme();
  const toneColor: Record<Tone, string> = {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    muted: theme.textMuted,
    inverse: theme.textInverse,
    brand: theme.primary,
    danger: theme.danger,
    success: theme.success,
  };
  const base = typography[variant];
  return (
    <RNText
      style={[
        { fontSize: base.fontSize, lineHeight: base.lineHeight, fontWeight: base.fontWeight },
        { color: toneColor[tone] },
        weight ? { fontWeight: weight } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
      {...rest}
    />
  );
}
