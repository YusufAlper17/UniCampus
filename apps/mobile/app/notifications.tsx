import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContentDomain, Visibility } from '@unicampus/shared-types';
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

  const [socialNotifications, setSocialNotifications] = useState(true);
  const [careerNotifications, setCareerNotifications] = useState(true);
  const [defaultFeedTab, setDefaultFeedTab] = useState<ContentDomain>('social');
  const [dmPermission, setDmPermission] = useState<Visibility>('public');

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getMe });

  useEffect(() => {
    const prefs = meQuery.data?.preferences;
    if (prefs) {
      setSocialNotifications(prefs.socialNotifications);
      setCareerNotifications(prefs.careerNotifications);
      setDefaultFeedTab(prefs.defaultFeedTab);
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
          icon="heart-outline"
          label="Sosyal bildirimler"
          description="Beğeni, yorum, takip istekleri"
          value={socialNotifications}
          onValueChange={(v) => {
            setSocialNotifications(v);
            patchPrefs({ socialNotifications: v });
          }}
          disabled={save.isPending}
        />
        <SettingSwitch
          icon="briefcase-outline"
          label="Kariyer bildirimler"
          description="Bağlantı istekleri, fırsatlar"
          value={careerNotifications}
          onValueChange={(v) => {
            setCareerNotifications(v);
            patchPrefs({ careerNotifications: v });
          }}
          disabled={save.isPending}
        />
      </View>

      <View style={{ gap: spacing[4] }}>
        <OptionPicker
          label="VARSAYILAN AKIŞ SEKMESİ"
          value={defaultFeedTab}
          onChange={(v) => {
            setDefaultFeedTab(v);
            patchPrefs({ defaultFeedTab: v });
          }}
          options={[
            { value: 'social', label: 'Sosyal', description: 'Uygulama açıldığında sosyal akış' },
            { value: 'career', label: 'Kariyer', description: 'Uygulama açıldığında kariyer akışı' },
          ]}
        />

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
