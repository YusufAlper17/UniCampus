import { useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  secure?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  hint,
  secure,
  leftIcon,
  containerStyle,
  ...rest
}: InputProps) {
  const { theme, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text variant="caption" tone="secondary">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor,
          borderRadius: radius.md,
          backgroundColor: theme.surface,
          paddingHorizontal: 14,
          height: 50,
        }}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon} size={20} color={theme.textMuted} style={{ marginRight: 8 }} />
        ) : null}
        <TextInput
          style={{ flex: 1, color: theme.textPrimary, fontSize: 16 }}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-off' : 'eye'} size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="micro" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="micro" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
