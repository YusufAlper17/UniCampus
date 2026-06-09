import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PublicAcademic } from '../features/users/api.js';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

function shortDepartment(name: string): string {
  return name
    .replace(/Mühendisliği/gi, 'Müh.')
    .replace(/Mühendislik/gi, 'Müh.')
    .replace(/Fakültesi/gi, 'Fak.')
    .replace(/Bölümü/gi, '')
    .trim();
}

export function ProfileAcademicGrid({ academic }: { academic: PublicAcademic }) {
  const { theme, spacing, radius } = useTheme();

  const tiles: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent: string }[] = [];
  if (academic.department)
    tiles.push({ icon: 'library', label: 'Bölüm', value: shortDepartment(academic.department), accent: theme.primary });
  if (academic.classYear != null)
    tiles.push({ icon: 'layers', label: 'Sınıf', value: String(academic.classYear), accent: theme.info });
  if (academic.gpa != null)
    tiles.push({ icon: 'stats-chart', label: 'GPA', value: academic.gpa.toFixed(2), accent: theme.success });

  if (!tiles.length) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
      }}
    >
      {tiles.map((t, i) => (
        <View
          key={t.label}
          style={{
            flex: 1,
            padding: spacing[3],
            gap: 6,
            borderLeftWidth: i === 0 ? 0 : 1,
            borderLeftColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={t.icon} size={14} color={t.accent} />
            <Text variant="micro" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {t.label}
            </Text>
          </View>
          <Text weight="700" numberOfLines={2} style={{ fontSize: 15, lineHeight: 19 }}>
            {t.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
