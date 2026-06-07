import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Bağımlılıksız tarih/saat seçici: gün chip'leri + saat chip'leri.
 * Expo Go uyumlu (native modül gerektirmez).
 */
export function DatePicker({ value, onChange }: DatePickerProps) {
  const { theme, radius, spacing } = useTheme();

  const days = useMemo(() => {
    const base = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  const hours = useMemo(() => Array.from({ length: 16 }, (_, i) => i + 8), []); // 08:00–23:00
  const selectedDay = startOfDay(value).getTime();

  const setDay = (day: Date) => {
    const next = new Date(day);
    next.setHours(value.getHours(), 0, 0, 0);
    onChange(next);
  };
  const setHour = (h: number) => {
    const next = new Date(value);
    next.setHours(h, 0, 0, 0);
    onChange(next);
  };

  return (
    <View style={{ gap: spacing[2] }}>
      <Text variant="caption" tone="muted">
        Gün
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d) => {
          const active = startOfDay(d).getTime() === selectedDay;
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => setDay(d)}
              style={{
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: radius.md,
                backgroundColor: active ? theme.primary : theme.surface2,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
              }}
            >
              <Text variant="micro" style={{ color: active ? '#fff' : theme.textMuted }}>
                {d.toLocaleDateString('tr-TR', { weekday: 'short' })}
              </Text>
              <Text weight="700" style={{ color: active ? '#fff' : theme.textPrimary }}>
                {d.getDate()}
              </Text>
              <Text variant="micro" style={{ color: active ? '#fff' : theme.textMuted }}>
                {d.toLocaleDateString('tr-TR', { month: 'short' })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
        Saat
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {hours.map((h) => {
          const active = value.getHours() === h;
          return (
            <Pressable
              key={h}
              onPress={() => setHour(h)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: radius.md,
                backgroundColor: active ? theme.primary : theme.surface2,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
              }}
            >
              <Text weight="600" style={{ color: active ? '#fff' : theme.textPrimary }}>
                {String(h).padStart(2, '0')}:00
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
