import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { CommunityVisibility, JoinMode } from '@unicampus/shared-types';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createCommunity } from '../../src/features/communities/api.js';
import { ApiError } from '../../src/lib/api.js';

const VISIBILITY_HINT: Record<CommunityVisibility, string> = {
  public: 'Keşfette görünür, herkes bulabilir.',
  unlisted: 'Yalnızca link ile bulunur.',
  private: 'Gizli; sadece üyeler içeriği görür.',
};

const JOIN_HINT: Record<JoinMode, string> = {
  open: 'Herkes anında katılır.',
  request: 'Katılım yönetici onayı ister.',
  invite: 'Yalnızca davet linkiyle katılınır.',
};

export default function CreateCommunity() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<CommunityVisibility>('public');
  const [joinMode, setJoinMode] = useState<JoinMode>('request');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (name.trim().length < 2) {
      toast.show('Topluluk adı en az 2 karakter', 'error');
      return;
    }
    setSaving(true);
    try {
      const { community } = await createCommunity({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        type: 'group',
        visibility,
        joinMode,
      });
      await qc.invalidateQueries({ queryKey: ['communities'] });
      toast.show('Topluluk oluşturuldu', 'success');
      router.replace(`/community/${community.id}`);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Oluşturulamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ gap: spacing[3] }}>
      <Stack.Screen options={{ title: 'Topluluk Oluştur', headerShown: true }} />
      <Input
        label="Topluluk adı"
        placeholder="Örn. Yapay Zeka Kulübü"
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
      />
      <Input
        label="Açıklama"
        placeholder="Topluluk ne hakkında?"
        value={description}
        onChangeText={setDescription}
        multiline
        autoCapitalize="sentences"
      />
      <Input
        label="Kategori"
        placeholder="Örn. Teknoloji, Spor, Sanat"
        value={category}
        onChangeText={setCategory}
        autoCapitalize="sentences"
      />

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Görünürlük
        </Text>
        <SegmentedControl<CommunityVisibility>
          segments={[
            { value: 'public', label: 'Açık' },
            { value: 'unlisted', label: 'Link' },
            { value: 'private', label: 'Gizli' },
          ]}
          value={visibility}
          onChange={setVisibility}
        />
        <Text variant="micro" tone="muted">
          {VISIBILITY_HINT[visibility]}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Katılım
        </Text>
        <SegmentedControl<JoinMode>
          segments={[
            { value: 'open', label: 'Herkese' },
            { value: 'request', label: 'İstekle' },
            { value: 'invite', label: 'Davetle' },
          ]}
          value={joinMode}
          onChange={setJoinMode}
        />
        <Text variant="micro" tone="muted">
          {JOIN_HINT[joinMode]}
        </Text>
      </View>

      <Button label="Topluluğu Oluştur" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
    </Screen>
  );
}
