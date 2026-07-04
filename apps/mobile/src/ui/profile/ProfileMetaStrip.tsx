import { View } from 'react-native';
import type { PublicAcademic } from '../../features/users/api.js';
import { useTheme } from '../../lib/theme.js';
import { Text } from '../Text.js';

function shortDepartment(name: string): string {
  return name
    .replace(/Mühendisliği/gi, 'Müh.')
    .replace(/Mühendislik/gi, 'Müh.')
    .replace(/Fakültesi/gi, 'Fak.')
    .replace(/Bölümü/gi, '')
    .trim();
}

export function ProfileMetaStrip({ academic }: { academic: PublicAcademic }) {
  const { theme, spacing, radius } = useTheme();

  const parts: string[] = [];
  if (academic.department) parts.push(shortDepartment(academic.department));
  if (academic.classYear != null) parts.push(`${academic.classYear}. sınıf`);
  if (academic.gpa != null) parts.push(`GPA ${academic.gpa.toFixed(2)}`);

  if (!parts.length) return null;

  return (
    <View
      style={{
        backgroundColor: theme.surface2,
        borderRadius: radius.lg,
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[3],
      }}
    >
      <Text variant="caption" tone="secondary" center>
        {parts.join('  ·  ')}
      </Text>
    </View>
  );
}
