import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PublicAcademic } from '../features/users/api.js';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

export function AcademicInfoCard({ academic }: { academic: PublicAcademic }) {
  const { theme, spacing, radius } = useTheme();

  const rows: Row[] = [];
  if (academic.faculty) rows.push({ icon: 'school-outline', label: 'Fakülte', value: academic.faculty });
  if (academic.department)
    rows.push({ icon: 'library-outline', label: 'Bölüm', value: academic.department });
  if (academic.classYear != null)
    rows.push({ icon: 'layers-outline', label: 'Sınıf', value: `${academic.classYear}. sınıf` });
  if (academic.gpa != null)
    rows.push({ icon: 'stats-chart-outline', label: 'GPA', value: academic.gpa.toFixed(2) });
  if (academic.studentNo)
    rows.push({ icon: 'card-outline', label: 'Öğrenci No', value: academic.studentNo });
  if (academic.graduationYear != null)
    rows.push({ icon: 'ribbon-outline', label: 'Mezuniyet', value: String(academic.graduationYear) });

  if (rows.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: theme.surface2,
        borderRadius: radius.lg,
        padding: spacing[3],
        gap: spacing[2],
      }}
    >
      <Text variant="caption" tone="muted">
        Akademik
      </Text>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={r.icon} size={16} color={theme.textMuted} />
          <Text variant="caption" tone="muted" style={{ width: 92 }}>
            {r.label}
          </Text>
          <Text variant="caption" weight="600" style={{ flex: 1 }}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
