import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createReel } from '../../src/features/reels/api.js';
import { ApiError } from '../../src/lib/api.js';

// Dev örnek kapaklar (gerçek video yükleyici lansman öncesi entegre edilir).
const SAMPLES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800',
];

export default function CreateReel() {
  const router = useRouter();
  const { theme, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!mediaUrl.trim()) {
      toast.show('Bir video/kapak seç', 'error');
      return;
    }
    setSaving(true);
    try {
      await createReel({ mediaUrl: mediaUrl.trim(), caption: caption.trim() || undefined });
      await qc.invalidateQueries({ queryKey: ['reels'] });
      toast.show('Reel paylaşıldı', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Reel Paylaş' }} />
      <View style={{ gap: spacing[3] }}>
        <Text variant="headingLg">Reel Paylaş</Text>
        <Text tone="muted">Kısa video paylaş. Dikey formatta en iyi görünür.</Text>

        {mediaUrl ? (
          <Image
            source={{ uri: mediaUrl }}
            style={{ width: '100%', height: 320, borderRadius: 16, backgroundColor: theme.surface2 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              height: 320,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: theme.border,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.surface,
            }}
          >
            <Text tone="muted">Aşağıdan bir kapak seç</Text>
          </View>
        )}

        <Text variant="caption" tone="muted">
          Hızlı seçim
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {SAMPLES.map((url) => (
            <Pressable key={url} onPress={() => setMediaUrl(url)} style={{ flex: 1 }}>
              <Image
                source={{ uri: url }}
                style={{
                  width: '100%',
                  height: 72,
                  borderRadius: 10,
                  borderWidth: mediaUrl === url ? 2 : 0,
                  borderColor: theme.primary,
                }}
              />
            </Pressable>
          ))}
        </View>

        <Input
          label="Video/kapak bağlantısı"
          value={mediaUrl}
          onChangeText={setMediaUrl}
          placeholder="https://..."
          autoCapitalize="none"
        />
        <Input
          label="Açıklama (opsiyonel)"
          value={caption}
          onChangeText={setCaption}
          placeholder="Bir şeyler yaz"
        />

        <Button label="Paylaş" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
      </View>
    </Screen>
  );
}
