import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Avatar } from './Avatar.js';
import { Badge } from './Badge.js';
import { LikeButton } from './LikeButton.js';
import { PollCard } from './PollCard.js';
import { EventCard } from './EventCard.js';
import { relativeTime, compactNumber } from '../lib/format.js';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onAuthorPress?: () => void;
  onVote?: (optionId: string) => void;
  onJoinEvent?: () => void;
  joiningEvent?: boolean;
}

const POST_TYPE_BADGE: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap } | undefined> = {
  project: { label: 'Proje', icon: 'rocket' },
  milestone: { label: 'Başarı', icon: 'trophy' },
  opportunity: { label: 'Fırsat', icon: 'megaphone' },
  event: { label: 'Etkinlik', icon: 'calendar' },
  poll: { label: 'Anket', icon: 'stats-chart' },
};

export const PostCard = memo(function PostCard({
  post,
  onPress,
  onLike,
  onComment,
  onAuthorPress,
  onVote,
  onJoinEvent,
  joiningEvent,
}: PostCardProps) {
  const { theme, spacing } = useTheme();
  const badge = POST_TYPE_BADGE[post.type];

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: theme.surface,
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        gap: spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={onAuthorPress}>
          <Avatar
            uri={post.author?.avatarUrl}
            name={post.author?.displayName}
            size={42}
            verified={post.author?.isVerifiedStudent}
          />
        </Pressable>
        <Pressable onPress={onAuthorPress} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text weight="600">{post.author?.displayName ?? 'Kullanıcı'}</Text>
            <Text variant="caption" tone="muted">
              · {relativeTime(post.createdAt)}
            </Text>
          </View>
          <Text variant="caption" tone="muted">
            @{post.author?.username ?? 'user'}
          </Text>
        </Pressable>
        {badge ? <Badge label={badge.label} tone="brand" icon={badge.icon} /> : null}
      </View>

      {post.content ? <Text style={{ lineHeight: 22 }}>{post.content}</Text> : null}

      {post.poll ? <PollCard poll={post.poll} onVote={onVote} /> : null}
      {post.event ? <EventCard event={post.event} onJoin={onJoinEvent} joining={joiningEvent} /> : null}

      {post.mediaUrls.length > 0 ? (
        <Image
          source={{ uri: post.mediaUrls[0] }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: theme.surface3 }}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginTop: 2 }}>
        <LikeButton liked={!!post.likedByMe} count={post.likeCount} onToggle={() => onLike?.()} />
        <Pressable onPress={onComment} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chatbubble-outline" size={22} color={theme.textSecondary} />
          {post.commentCount > 0 ? (
            <Text variant="caption" tone="secondary">
              {compactNumber(post.commentCount)}
            </Text>
          ) : null}
        </Pressable>
        <Pressable hitSlop={8}>
          <Ionicons name="paper-plane-outline" size={22} color={theme.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={8}>
          <Ionicons name="bookmark-outline" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  );
});
