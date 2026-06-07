import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { Badge } from '../../src/ui/Badge.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { useTheme } from '../../src/lib/theme.js';
import { getProject } from '../../src/features/career/api.js';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
  });

  const project = data?.project;
  const author = data?.author;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}
    >
      <Stack.Screen options={{ title: 'Proje', headerShown: true }} />
      {isLoading || !project ? (
        <View style={{ gap: 16 }}>
          <Skeleton height={24} width="70%" />
          <Skeleton height={14} width="40%" />
          <Skeleton height={120} radius={14} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="rocket" size={24} color={theme.info} />
            <Text variant="headingLg" style={{ flex: 1 }}>
              {project.title}
            </Text>
          </View>
          {project.role ? <Badge label={project.role} tone="info" icon="construct" /> : null}

          {author ? (
            <Pressable
              onPress={() => router.push(`/u/${author.username}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: spacing[3],
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
              }}
            >
              <Avatar uri={author.avatarUrl ?? null} name={author.displayName} size={44} verified={author.isVerifiedStudent} />
              <View style={{ flex: 1 }}>
                <Text weight="600">{author.displayName}</Text>
                <Text variant="caption" tone="muted">
                  {author.careerHeadline ?? `@${author.username}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}

          {project.description ? (
            <Text tone="secondary" style={{ lineHeight: 22 }}>
              {project.description}
            </Text>
          ) : null}

          {project.techTags.length ? (
            <View style={{ gap: spacing[2] }}>
              <Text variant="caption" tone="muted">
                Teknolojiler
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {project.techTags.map((t) => (
                  <Badge key={t} label={t} tone="info" />
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: 4 }}>
            {project.githubUrl ? (
              <Pressable
                onPress={() => Linking.openURL(project.githubUrl!)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="logo-github" size={20} color={theme.textSecondary} />
                <Text tone="brand">GitHub</Text>
              </Pressable>
            ) : null}
            {project.demoUrl ? (
              <Pressable
                onPress={() => Linking.openURL(project.demoUrl!)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
                <Text tone="brand">Demo</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}
