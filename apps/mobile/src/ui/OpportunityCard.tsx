import { Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Badge } from './Badge.js';
import { Button } from './Button.js';

export interface OpportunityEntity {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  company?: string | null;
  location?: string | null;
  deadline?: string | null;
  applyUrl?: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  internship: 'Staj',
  job: 'İş',
  scholarship: 'Burs',
  volunteer: 'Gönüllü',
  research: 'Araştırma',
  other: 'Fırsat',
};

export function OpportunityCard({ opportunity }: { opportunity: OpportunityEntity }) {
  const { theme, radius, spacing } = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: spacing[3],
        gap: 8,
        backgroundColor: theme.surface,
      }}
    >
      <Badge label={TYPE_LABEL[opportunity.type] ?? 'Fırsat'} tone="success" icon="megaphone" />
      <Text weight="600" variant="headingMd">
        {opportunity.title}
      </Text>
      {opportunity.company ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="business-outline" size={15} color={theme.textMuted} />
          <Text variant="caption" tone="secondary">
            {opportunity.company}
            {opportunity.location ? ` · ${opportunity.location}` : ''}
          </Text>
        </View>
      ) : null}
      {opportunity.description ? <Text tone="secondary">{opportunity.description}</Text> : null}
      {opportunity.deadline ? (
        <Text variant="caption" tone="muted">
          Son başvuru: {new Date(opportunity.deadline).toLocaleDateString('tr-TR')}
        </Text>
      ) : null}
      {opportunity.applyUrl ? (
        <Button
          label="İlgileniyorum"
          size="sm"
          onPress={() => Linking.openURL(opportunity.applyUrl!)}
        />
      ) : null}
    </View>
  );
}
