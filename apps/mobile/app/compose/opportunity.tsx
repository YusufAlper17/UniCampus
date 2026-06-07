import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { CreateOpportunityInput } from '@unicampus/shared-types';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createOpportunity } from '../../src/features/career/api.js';
import { ApiError } from '../../src/lib/api.js';

type OppType = CreateOpportunityInput['type'];

export default function ComposeOpportunity() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<OppType>('internship');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (title.trim().length < 2) {
      toast.show('Başlık gerekli', 'error');
      return;
    }
    setSaving(true);
    try {
      await createOpportunity({
        title: title.trim(),
        type,
        company: company.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        applyUrl: applyUrl.trim() || undefined,
      });
      toast.show('Fırsat moderasyona gönderildi', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ gap: spacing[3] }}>
      <Input label="Başlık" placeholder="Örn. Frontend Staj İlanı" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="secondary">
          Tür
        </Text>
        <SegmentedControl<OppType>
          segments={[
            { value: 'internship', label: 'Staj' },
            { value: 'job', label: 'İş' },
            { value: 'scholarship', label: 'Burs' },
            { value: 'other', label: 'Diğer' },
          ]}
          value={type}
          onChange={setType}
        />
      </View>
      <Input label="Şirket / Kurum" placeholder="Örn. Acme" leftIcon="business" value={company} onChangeText={setCompany} autoCapitalize="sentences" />
      <Input label="Konum" placeholder="Örn. İstanbul / Uzaktan" leftIcon="location" value={location} onChangeText={setLocation} autoCapitalize="sentences" />
      <Input label="Açıklama" placeholder="Detaylar, gereksinimler" value={description} onChangeText={setDescription} multiline autoCapitalize="sentences" />
      <Input label="Başvuru URL" placeholder="https://..." leftIcon="link" value={applyUrl} onChangeText={setApplyUrl} keyboardType="url" />
      <Text variant="caption" tone="muted">
        Fırsat ilanları moderasyon onayından sonra yayınlanır.
      </Text>
      <Button label="Fırsatı Gönder" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
    </Screen>
  );
}
