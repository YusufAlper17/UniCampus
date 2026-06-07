import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createPoll } from '../../src/features/polls/api.js';
import { ApiError } from '../../src/lib/api.js';

const DURATIONS: { value: number; label: string }[] = [
  { value: 24, label: '1 gün' },
  { value: 72, label: '3 gün' },
  { value: 168, label: '1 hafta' },
];

export default function ComposePoll() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(24);
  const [multiChoice, setMultiChoice] = useState<'single' | 'multi'>('single');
  const [saving, setSaving] = useState(false);

  function setOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }
  function addOption() {
    if (options.length < 4) setOptions((prev) => [...prev, '']);
  }
  function removeOption(i: number) {
    if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 1) {
      toast.show('Soru gerekli', 'error');
      return;
    }
    if (clean.length < 2) {
      toast.show('En az 2 seçenek gir', 'error');
      return;
    }
    setSaving(true);
    try {
      await createPoll({
        question: question.trim(),
        options: clean,
        durationHours: duration,
        multiChoice: multiChoice === 'multi',
        isAnonymous: true,
      });
      await qc.invalidateQueries({ queryKey: ['feed', 'social'] });
      toast.show('Anket paylaşıldı', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ gap: spacing[3] }}>
      <Input label="Soru" placeholder="Ne sormak istersin?" value={question} onChangeText={setQuestion} autoCapitalize="sentences" />

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Seçenekler
        </Text>
        {options.map((opt, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input placeholder={`Seçenek ${i + 1}`} value={opt} onChangeText={(v) => setOption(i, v)} autoCapitalize="sentences" />
            </View>
            {options.length > 2 ? (
              <Pressable onPress={() => removeOption(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {options.length < 4 ? (
          <Pressable onPress={addOption} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
            <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
            <Text tone="brand" weight="600">
              Seçenek ekle
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Süre
        </Text>
        <SegmentedControl<string>
          segments={DURATIONS.map((d) => ({ value: String(d.value), label: d.label }))}
          value={String(duration)}
          onChange={(v) => setDuration(Number(v))}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Oylama
        </Text>
        <SegmentedControl<'single' | 'multi'>
          segments={[
            { value: 'single', label: 'Tek seçim' },
            { value: 'multi', label: 'Çoklu seçim' },
          ]}
          value={multiChoice}
          onChange={setMultiChoice}
        />
      </View>

      <Button label="Anketi Paylaş" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
    </Screen>
  );
}
