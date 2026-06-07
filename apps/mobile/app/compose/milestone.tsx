import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/ui/Screen.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createMilestone } from '../../src/features/career/api.js';
import { ApiError } from '../../src/lib/api.js';

export default function ComposeMilestone() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (title.trim().length < 2) {
      toast.show('Başlık gerekli', 'error');
      return;
    }
    setSaving(true);
    try {
      await createMilestone({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      await qc.invalidateQueries({ queryKey: ['feed', 'career'] });
      toast.show('Başarı paylaşıldı', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ gap: spacing[3] }}>
      <Input label="Başarı" placeholder="Örn. Yeni işe başladım!" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
      <Input label="Açıklama" placeholder="Detaylar (opsiyonel)" value={description} onChangeText={setDescription} multiline autoCapitalize="sentences" />
      <Button label="Başarıyı Paylaş" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
    </Screen>
  );
}
