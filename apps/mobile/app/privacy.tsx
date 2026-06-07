import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AccountVisibility, Visibility } from '@unicampus/shared-types';
import { Screen } from '../src/ui/Screen.js';
import { Text } from '../src/ui/Text.js';
import { Button } from '../src/ui/Button.js';
import { OptionPicker } from '../src/ui/SettingRow.js';
import { useToast } from '../src/ui/Toast.js';
import { useTheme } from '../src/lib/theme.js';
import { getMe, updateProfile } from '../src/features/users/api.js';

export default function PrivacySettings() {
  const { spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [accountVisibility, setAccountVisibility] = useState<AccountVisibility>('public');
  const [careerVisibility, setCareerVisibility] = useState<Visibility>('public');

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getMe });

  useEffect(() => {
    if (meQuery.data?.user) {
      setAccountVisibility(meQuery.data.user.accountVisibility);
      setCareerVisibility(meQuery.data.user.careerVisibility);
    }
  }, [meQuery.data?.user]);

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({ accountVisibility, careerVisibility }),
    onSuccess: () => {
      toast.show('Gizlilik ayarları kaydedildi', 'success');
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => toast.show('Kaydedilemedi', 'error'),
  });

  const dirty =
    meQuery.data?.user &&
    (meQuery.data.user.accountVisibility !== accountVisibility ||
      meQuery.data.user.careerVisibility !== careerVisibility);

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Gizlilik' }} />
      <Text variant="headingLg" style={{ marginBottom: spacing[1] }}>
        Gizlilik
      </Text>
      <Text tone="muted" style={{ marginBottom: spacing[4] }}>
        Hesap ve kariyer görünürlüğünü yönet.
      </Text>

      <View style={{ gap: spacing[4] }}>
        <OptionPicker
          label="HESAP GÖRÜNÜRLÜĞÜ"
          value={accountVisibility}
          onChange={setAccountVisibility}
          options={[
            {
              value: 'public',
              label: 'Açık hesap',
              description: 'Herkes profilini ve gönderilerini görebilir.',
            },
            {
              value: 'private',
              label: 'Gizli hesap',
              description: 'Takip isteklerini onaylaman gerekir.',
            },
          ]}
        />

        <OptionPicker
          label="KARİYER GÖRÜNÜRLÜĞÜ"
          value={careerVisibility}
          onChange={setCareerVisibility}
          options={[
            {
              value: 'public',
              label: 'Herkes',
              description: 'Kampüsteki herkes kariyer profilini görebilir.',
            },
            {
              value: 'connections',
              label: 'Bağlantılar',
              description: 'Yalnızca bağlantıların görebilir.',
            },
            {
              value: 'followers',
              label: 'Takipçiler',
              description: 'Seni takip edenler görebilir.',
            },
            {
              value: 'private',
              label: 'Yalnızca ben',
              description: 'Kariyer profilin gizli kalır.',
            },
          ]}
        />
      </View>

      {dirty ? (
        <Button
          label={saveMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          style={{ marginTop: spacing[4] }}
        />
      ) : null}
    </Screen>
  );
}
