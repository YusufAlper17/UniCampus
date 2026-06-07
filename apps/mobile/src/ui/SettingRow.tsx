import { Pressable, Switch as RNSwitch, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
}

export function SettingRow({
  icon,
  label,
  description,
  onPress,
  showChevron = true,
  style,
}: SettingRowProps) {
  const { theme, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderRadius: radius.md,
          backgroundColor: theme.surface2,
          opacity: pressed && onPress ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.surface3,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="600">{label}</Text>
          {description ? (
            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      ) : null}
    </Pressable>
  );
}

interface SettingSwitchProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

export function SettingSwitch({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: SettingSwitchProps) {
  const { theme, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: radius.md,
        backgroundColor: theme.surface2,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.surface3,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="600">{label}</Text>
          {description ? (
            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

interface OptionPickerProps<T extends string> {
  label: string;
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function OptionPicker<T extends string>({ label, options, value, onChange }: OptionPickerProps<T>) {
  const { theme, spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing[2] }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: selected ? theme.primary : theme.border,
              backgroundColor: selected ? `${theme.primary}12` : theme.surface2,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text weight="600">{o.label}</Text>
              {o.description ? (
                <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {o.description}
                </Text>
              ) : null}
            </View>
            {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
