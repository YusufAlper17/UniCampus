import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../src/ui/Screen.js';
import { Text } from '../src/ui/Text.js';
import { Button } from '../src/ui/Button.js';
import { OTPInput } from '../src/ui/OTPInput.js';
import { useToast } from '../src/ui/Toast.js';
import { useTheme } from '../src/lib/theme.js';
import { disable2FA, enable2FA, setup2FA } from '../src/features/auth/api.js';
import { getMe } from '../src/features/users/api.js';

export default function SecuritySettings() {
  const { theme, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'idle' | 'setup' | 'disable'>('idle');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getMe });
  const enabled = !!meQuery.data?.user.twoFactorEnabled;

  const setupMutation = useMutation({
    mutationFn: setup2FA,
    onSuccess: (res) => {
      setSecret(res.secret);
      setCode('');
      setMode('setup');
      toast.show('Authenticator uygulamasına secret ekleyin', 'info');
    },
    onError: () => toast.show('2FA kurulumu başlatılamadı', 'error'),
  });

  const enableMutation = useMutation({
    mutationFn: (c: string) => enable2FA(c),
    onSuccess: () => {
      toast.show('2FA etkinleştirildi', 'success');
      setMode('idle');
      setCode('');
      setSecret('');
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => toast.show('Kod hatalı', 'error'),
  });

  const disableMutation = useMutation({
    mutationFn: (c: string) => disable2FA(c),
    onSuccess: () => {
      toast.show('2FA devre dışı bırakıldı', 'success');
      setMode('idle');
      setCode('');
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => toast.show('Kod hatalı', 'error'),
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Güvenlik' }} />
      <Text variant="headingLg" style={{ marginBottom: spacing[1] }}>
        Güvenlik
      </Text>
      <Text tone="muted" style={{ marginBottom: spacing[4] }}>
        Hesabını ekstra katmanlarla koru.
      </Text>

      <View
        style={{
          padding: spacing[3],
          borderRadius: 16,
          backgroundColor: theme.surface2,
          borderWidth: 1,
          borderColor: enabled ? theme.success : theme.border,
          gap: spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="headingMd">İki Faktörlü Doğrulama</Text>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: enabled ? `${theme.success}22` : `${theme.textMuted}22`,
            }}
          >
            <Text variant="caption" style={{ color: enabled ? theme.success : theme.textMuted }}>
              {enabled ? 'Aktif' : 'Kapalı'}
            </Text>
          </View>
        </View>
        <Text tone="muted" variant="caption">
          Giriş yaparken authenticator uygulamasından 6 haneli kod ister.
        </Text>

        {!enabled && mode === 'idle' ? (
          <Button
            label="2FA Kur"
            variant="secondary"
            onPress={() => setupMutation.mutate()}
            loading={setupMutation.isPending}
          />
        ) : null}

        {mode === 'setup' && secret ? (
          <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
            <Text variant="caption" tone="muted">
              Secret (manuel giriş):
            </Text>
            <Text selectable style={{ fontFamily: 'monospace', fontSize: 13 }}>
              {secret}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: spacing[2] }}>
              Authenticator kodunu gir:
            </Text>
            <OTPInput
              length={6}
              value={code}
              onChange={setCode}
              onComplete={(c) => enableMutation.mutate(c)}
            />
            {enableMutation.isPending ? (
              <Text tone="muted" center variant="caption">
                Doğrulanıyor...
              </Text>
            ) : null}
          </View>
        ) : null}

        {enabled && mode === 'idle' ? (
          <Button
            label="2FA Devre Dışı Bırak"
            variant="outline"
            onPress={() => {
              setCode('');
              setMode('disable');
            }}
          />
        ) : null}

        {mode === 'disable' ? (
          <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
            <Text variant="caption" tone="muted">
              Devre dışı bırakmak için mevcut kodu gir:
            </Text>
            <OTPInput
              length={6}
              value={code}
              onChange={setCode}
              onComplete={(c) => disableMutation.mutate(c)}
            />
            <Button label="İptal" variant="ghost" onPress={() => setMode('idle')} />
          </View>
        ) : null}
      </View>

      <View
        style={{
          marginTop: spacing[4],
          padding: spacing[3],
          borderRadius: 16,
          backgroundColor: theme.surface2,
          gap: spacing[1],
        }}
      >
        <Text variant="headingMd">Mesaj Şifreleme</Text>
        <Text tone="muted" variant="caption">
          1:1 mesajlar Signal Protocol ile uçtan uca şifrelenir. Sunucu düz metni görmez.
        </Text>
      </View>
    </Screen>
  );
}
