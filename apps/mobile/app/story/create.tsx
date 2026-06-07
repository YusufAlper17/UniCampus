import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { StoryAudience } from '@unicampus/shared-types';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { OptionPicker } from '../../src/ui/SettingRow.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createStory } from '../../src/features/stories/api.js';
import { ApiError } from '../../src/lib/api.js';

// Dev ortamında hızlı seçim için örnek görseller (gerçek yükleyici lansman öncesi eklenir).
const SAMPLES = [
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800',
];

export default function CreateStory() {
  const router = useRouter();
  const { theme, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<StoryAudience>('public');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!mediaUrl.trim()) {
      toast.show('Bir görsel seç', 'error');
      return;
    }
    setSaving(true);
    try {
      await createStory({ mediaUrl: mediaUrl.trim(), caption: caption.trim() || undefined, audience });
      await qc.invalidateQueries({ queryKey: ['stories'] });
      toast.show('Story paylaşıldı', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Story Ekle' }} />
      <View style={{ gap: spacing[3] }}>
        <Text variant="headingLg">Story Ekle</Text>

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
              gap: 8,
              backgroundColor: theme.surface,
            }}
          >
            <Text tone="muted">Aşağıdan bir görsel seç</Text>
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
          label="Görsel bağlantısı"
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

        <OptionPicker
          label="Kimler görebilir?"
          value={audience}
          onChange={setAudience}
          options={[
            { value: 'public', label: 'Herkes' },
            { value: 'close_friends', label: 'Yakın Arkadaşlar' },
          ]}
        />

        <Button label="Paylaş" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
      </View>
    </Screen>
  );
}
