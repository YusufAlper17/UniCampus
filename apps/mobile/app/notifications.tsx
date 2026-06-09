import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Visibility } from '@unicampus/shared-types';
import { Screen } from '../src/ui/Screen.js';
import { Text } from '../src/ui/Text.js';
import { SettingSwitch } from '../src/ui/SettingRow.js';
import { OptionPicker } from '../src/ui/SettingRow.js';
import { useToast } from '../src/ui/Toast.js';
import { useTheme } from '../src/lib/theme.js';
import { getMe, updatePreferences } from '../src/features/users/api.js';

export default function NotificationSettings() {
  const { spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const [notifications, setNotifications] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [dmPermission, setDmPermission] = useState<Visibility>('public');

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getMe });

  useEffect(() => {
    const prefs = meQuery.data?.preferences;
    if (prefs) {
      setNotifications(prefs.socialNotifications);
      setEventReminders(prefs.careerNotifications);
      setDmPermission(prefs.dmPermission);
    }
  }, [meQuery.data?.preferences]);

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof updatePreferences>[0]) => updatePreferences(patch),
    onSuccess: () => {
      toast.show('Tercihler güncellendi', 'success');
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => toast.show('Güncellenemedi', 'error'),
  });

  function patchPrefs(patch: Parameters<typeof updatePreferences>[0]) {
    save.mutate(patch);
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Bildirimler' }} />
      <Text variant="headingLg" style={{ marginBottom: spacing[1] }}>
        Bildirimler
      </Text>
      <Text tone="muted" style={{ marginBottom: spacing[4] }}>
        Hangi etkinliklerde bildirim alacağını seç.
      </Text>

      <View style={{ gap: spacing[2], marginBottom: spacing[4] }}>
        <SettingSwitch
          icon="notifications-outline"
          label="Push bildirimleri"
          description="Beğeni, yorum, takip, mesaj ve bağlantı istekleri"
          value={notifications}
          onValueChange={(v) => {
            setNotifications(v);
            patchPrefs({ socialNotifications: v });
          }}
          disabled={save.isPending}
        />
        <SettingSwitch
          icon="calendar-outline"
          label="Etkinlik hatırlatmaları"
          description="Katıldığın etkinlikler ve topluluk duyuruları"
          value={eventReminders}
          onValueChange={(v) => {
            setEventReminders(v);
            patchPrefs({ careerNotifications: v });
          }}
          disabled={save.isPending}
        />
      </View>

      <View style={{ gap: spacing[4] }}>
        <OptionPicker
          label="KİMDEN MESAJ ALABİLİRSİN"
          value={dmPermission}
          onChange={(v) => {
            setDmPermission(v);
            patchPrefs({ dmPermission: v });
          }}
          options={[
            { value: 'public', label: 'Herkes', description: 'Kampüsteki herkes mesaj atabilir' },
            { value: 'followers', label: 'Takipçiler', description: 'Seni takip edenler' },
            { value: 'connections', label: 'Bağlantılar', description: 'Yalnızca bağlantıların' },
            { value: 'private', label: 'Kimse', description: 'DM kapalı' },
          ]}
        />
      </View>
    </Screen>
  );
}
