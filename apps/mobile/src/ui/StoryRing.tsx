import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Avatar } from './Avatar.js';

export interface StoryItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
  seen?: boolean;
}

interface StoryRingProps {
  stories: StoryItem[];
  onAddStory?: () => void;
  onOpenStory?: (id: string) => void;
}

// Story şeridi — kendi story ekle + takip edilenlerin story'leri (içerik Faz 11).
export function StoryRing({ stories, onAddStory, onOpenStory }: StoryRingProps) {
  const { theme, spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing[3], gap: spacing[3], paddingVertical: spacing[2] }}
    >
      <Pressable onPress={onAddStory} style={{ alignItems: 'center', gap: 4, width: 64 }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.surface2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: theme.border,
            borderStyle: 'dashed',
          }}
        >
          <Ionicons name="add" size={26} color={theme.primary} />
        </View>
        <Text variant="micro" tone="muted" numberOfLines={1}>
          Story ekle
        </Text>
      </Pressable>

      {stories.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => onOpenStory?.(s.id)}
          style={{ alignItems: 'center', gap: 4, width: 64 }}
        >
          <Avatar uri={s.avatarUrl} name={s.name} size={60} ring={!s.seen} />
          <Text variant="micro" tone="secondary" numberOfLines={1}>
            {s.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
