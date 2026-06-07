import { View, Linking, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Badge } from './Badge.js';

export interface ProjectEntity {
  id: string;
  title: string;
  role?: string | null;
  description?: string | null;
  techTags: string[];
  githubUrl?: string | null;
  demoUrl?: string | null;
}

export function ProjectCard({ project, onPress }: { project: ProjectEntity; onPress?: () => void }) {
  const { theme, radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: spacing[3],
        gap: 8,
        backgroundColor: theme.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="rocket" size={18} color={theme.info} />
        <Text weight="600" variant="headingMd" style={{ flex: 1 }}>
          {project.title}
        </Text>
      </View>
      {project.role ? (
        <Text variant="caption" tone="muted">
          {project.role}
        </Text>
      ) : null}
      {project.description ? <Text tone="secondary">{project.description}</Text> : null}
      {project.techTags.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {project.techTags.map((t) => (
            <Badge key={t} label={t} tone="info" />
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: 4 }}>
        {project.githubUrl ? (
          <Pressable
            onPress={() => Linking.openURL(project.githubUrl!)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="logo-github" size={16} color={theme.textSecondary} />
            <Text variant="caption" tone="brand">
              GitHub
            </Text>
          </Pressable>
        ) : null}
        {project.demoUrl ? (
          <Pressable
            onPress={() => Linking.openURL(project.demoUrl!)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
            <Text variant="caption" tone="brand">
              Demo
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
