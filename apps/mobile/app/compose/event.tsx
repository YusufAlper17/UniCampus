import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { ParticipationType } from '@unicampus/shared-types';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { DatePicker } from '../../src/ui/DatePicker.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createEvent } from '../../src/features/events/api.js';
import { ApiError } from '../../src/lib/api.js';

export default function ComposeEvent() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d;
  });
  const [capacity, setCapacity] = useState('');
  const [participationType, setParticipationType] = useState<ParticipationType>('open');
  const [paid, setPaid] = useState<'free' | 'paid'>('free');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (title.trim().length < 1) {
      toast.show('Başlık gerekli', 'error');
      return;
    }
    const isPaid = paid === 'paid';
    if (isPaid && (!price || Number(price) <= 0)) {
      toast.show('Ücretli etkinlik için fiyat gir', 'error');
      return;
    }
    setSaving(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        locationText: locationText.trim() || undefined,
        startsAt: startsAt.toISOString(),
        capacity: capacity ? Number(capacity) : null,
        isPaid,
        price: isPaid ? Number(price) : undefined,
        participationType,
        scope: 'individual',
      });
      await qc.invalidateQueries({ queryKey: ['feed'] });
      toast.show('Etkinlik paylaşıldı', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ gap: spacing[3] }}>
      <Input label="Başlık" placeholder="Etkinlik adı" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
      <Input
        label="Açıklama"
        placeholder="Detaylar"
        value={description}
        onChangeText={setDescription}
        multiline
        autoCapitalize="sentences"
      />
      <Input label="Konum" placeholder="Örn. Merkez Kampüs A101" leftIcon="location" value={locationText} onChangeText={setLocationText} autoCapitalize="sentences" />

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Tarih ve saat
        </Text>
        <DatePicker value={startsAt} onChange={setStartsAt} />
      </View>

      <Input label="Kapasite (boş = sınırsız)" placeholder="Örn. 50" keyboardType="number-pad" value={capacity} onChangeText={setCapacity} />

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Katılım
        </Text>
        <SegmentedControl<ParticipationType>
          segments={[
            { value: 'open', label: 'Açık' },
            { value: 'approval', label: 'Onaylı' },
            { value: 'invite', label: 'Davetli' },
          ]}
          value={participationType}
          onChange={setParticipationType}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Ücret
        </Text>
        <SegmentedControl<'free' | 'paid'>
          segments={[
            { value: 'free', label: 'Ücretsiz' },
            { value: 'paid', label: 'Ücretli' },
          ]}
          value={paid}
          onChange={setPaid}
        />
        {paid === 'paid' ? (
          <Input label="Fiyat (₺)" placeholder="Örn. 50" keyboardType="number-pad" value={price} onChangeText={setPrice} />
        ) : null}
      </View>

      <Button label="Etkinliği Paylaş" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
    </Screen>
  );
}
