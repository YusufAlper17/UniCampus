import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../src/ui/Screen.js';
import { Text } from '../src/ui/Text.js';
import { Button } from '../src/ui/Button.js';
import { SettingRow } from '../src/ui/SettingRow.js';
import { useTheme, type ThemePref } from '../src/lib/theme.js';
import { useAuthStore } from '../src/lib/auth-store.js';
import { updatePreferences } from '../src/features/users/api.js';

export default function Settings() {
  const router = useRouter();
  const { theme, spacing, pref, setPref } = useTheme();
  const signOut = useAuthStore((s) => s.signOut);
  const qc = useQueryClient();

  const themeMutation = useMutation({
    mutationFn: (t: ThemePref) => updatePreferences({ theme: t }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me'] }),
  });

  function selectTheme(next: ThemePref) {
    setPref(next);
    themeMutation.mutate(next);
  }

  const themeOptions: { value: ThemePref; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'system', label: 'Sistem', icon: 'phone-portrait-outline' },
    { value: 'light', label: 'Açık', icon: 'sunny-outline' },
    { value: 'dark', label: 'Koyu', icon: 'moon-outline' },
  ];

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Ayarlar' }} />
      <Text variant="headingLg" style={{ marginBottom: spacing[4] }}>
        Ayarlar
      </Text>

      <Text variant="caption" tone="muted" style={{ marginBottom: spacing[2] }}>
        GÖRÜNÜM
      </Text>
      <View style={{ gap: spacing[2], marginBottom: spacing[4] }}>
        {themeOptions.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => selectTheme(o.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: pref === o.value ? theme.primary : theme.border,
              backgroundColor: pref === o.value ? `${theme.primary}10` : theme.surface2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={o.icon} size={20} color={theme.textPrimary} />
              <Text weight="600">{o.label}</Text>
            </View>
            {pref === o.value ? (
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <Text variant="caption" tone="muted" style={{ marginBottom: spacing[2] }}>
        HESAP
      </Text>
      <View style={{ gap: spacing[2], marginBottom: spacing[4] }}>
        <SettingRow icon="person-outline" label="Profili düzenle" onPress={() => router.push('/edit-profile')} />
        <SettingRow icon="shield-checkmark-outline" label="Gizlilik" onPress={() => router.push('/privacy')} />
        <SettingRow icon="notifications-outline" label="Bildirimler" onPress={() => router.push('/notifications')} />
        <SettingRow icon="lock-closed-outline" label="Güvenlik ve 2FA" onPress={() => router.push('/security')} />
        <SettingRow icon="school-outline" label="Akademik profil" onPress={() => router.push('/edit-academic')} />
      </View>

      <Button label="Çıkış Yap" variant="danger" onPress={() => void signOut()} style={{ marginTop: spacing[2] }} />
    </Screen>
  );
}
