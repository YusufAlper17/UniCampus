import { Text as RNText } from 'react-native';
import { useTheme } from '../lib/theme.js';

interface WordmarkProps {
  size?: number;
  color?: string;
}

/** Marka logotipi — script fontlu "UniCampus" yazısı. */
export function Wordmark({ size = 26, color }: WordmarkProps) {
  const { theme } = useTheme();
  return (
    <RNText
      style={{
        fontFamily: 'Pacifico_400Regular',
        fontSize: size,
        lineHeight: size * 1.45,
        color: color ?? theme.textPrimary,
      }}
    >
      UniCampus
    </RNText>
  );
}
