import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
}

// 6 haneli OTP — gizli tek TextInput + görsel kutular. Yapıştırma desteği.
export function OTPInput({ length = 6, value, onChange, onComplete }: OTPInputProps) {
  const { theme, radius } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {Array.from({ length }).map((_, i) => {
          const char = value[i] ?? '';
          const active = focused && i === value.length;
          return (
            <View
              key={i}
              style={{
                width: 48,
                height: 56,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: active ? theme.primary : char ? theme.primary : theme.border,
                backgroundColor: theme.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="headingMd">{char}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        autoFocus
      />
    </Pressable>
  );
}
