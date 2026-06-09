import { memo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { MediaItem, Post } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Avatar } from './Avatar.js';
import { Badge } from './Badge.js';
import { LikeButton } from './LikeButton.js';
import { PollCard } from './PollCard.js';
import { EventCard } from './EventCard.js';
import { MediaCarousel } from './MediaCarousel.js';
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
  const router = useRouter();
  const badge = POST_TYPE_BADGE[post.type];
  const [saved, setSaved] = useState(!!post.savedByMe);

  const media: MediaItem[] =
    post.media && post.media.length
      ? post.media
      : post.mediaUrls.map((url) => ({ type: 'image' as const, url }));

  async function share() {
    void Haptics.selectionAsync();
    try {
      await Share.share({
        message: `${post.author?.displayName ?? 'UniCampus'}: ${post.content ?? 'UniCampus gönderisi'}`,
      });
    } catch {
      /* yoksay */
    }
  }

  function toggleSave() {
    void Haptics.selectionAsync();
    setSaved((s) => !s);
  }

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        paddingVertical: spacing[2],
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      {/* Başlık */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: spacing[3],
          marginBottom: spacing[1],
        }}
      >
        <Pressable onPress={onAuthorPress}>
          <Avatar
            uri={post.author?.avatarUrl}
            name={post.author?.displayName}
            size={40}
            verified={post.author?.isVerifiedStudent}
          />
        </Pressable>
        <Pressable onPress={onAuthorPress} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text weight="600">{post.author?.displayName ?? 'Kullanıcı'}</Text>
            <Text variant="caption" tone="muted">
              · {relativeTime(post.createdAt)}
            </Text>
          </View>
          {post.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="location" size={11} color={theme.textMuted} />
              <Text variant="micro" tone="muted">
                {post.location}
              </Text>
            </View>
          ) : (
            <Text variant="micro" tone="muted">
              @{post.author?.username ?? 'user'}
            </Text>
          )}
        </Pressable>
        {badge ? <Badge label={badge.label} tone="brand" icon={badge.icon} /> : null}
      </View>

      {/* Metin */}
      {post.content ? (
        <Pressable onPress={onPress} style={{ paddingHorizontal: spacing[3], marginBottom: media.length ? spacing[2] : 0 }}>
          <Text style={{ lineHeight: 22 }}>{post.content}</Text>
        </Pressable>
      ) : null}

      {/* Anket / etkinlik */}
      {post.poll ? (
        <View style={{ paddingHorizontal: spacing[3] }}>
          <PollCard poll={post.poll} onVote={onVote} />
        </View>
      ) : null}
      {post.event ? (
        <View style={{ paddingHorizontal: spacing[3] }}>
          <EventCard
            event={post.event}
            onJoin={onJoinEvent}
            joining={joiningEvent}
            onPressAttendees={() => router.push(`/event/${post.event!.id}/attendees`)}
          />
        </View>
      ) : null}

      {/* Medya (tam genişlik) */}
      {media.length ? <MediaCarousel media={media} aspectRatio={1} onPressItem={onPress} /> : null}

      {/* Aksiyonlar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
          paddingHorizontal: spacing[3],
          marginTop: spacing[2],
        }}
      >
        <LikeButton liked={!!post.likedByMe} count={post.likeCount} onToggle={() => onLike?.()} />
        <Pressable onPress={onComment} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chatbubble-outline" size={24} color={theme.textSecondary} />
          {post.commentCount > 0 ? (
            <Text variant="caption" tone="secondary">
              {compactNumber(post.commentCount)}
            </Text>
          ) : null}
        </Pressable>
        <Pressable onPress={share} hitSlop={8}>
          <Ionicons name="paper-plane-outline" size={23} color={theme.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={toggleSave} hitSlop={8}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={23} color={saved ? theme.primary : theme.textSecondary} />
        </Pressable>
      </View>

      {/* Yorum bağlantısı */}
      {post.commentCount > 0 ? (
        <Pressable onPress={onComment} style={{ paddingHorizontal: spacing[3], marginTop: 4 }}>
          <Text variant="caption" tone="muted">
            {compactNumber(post.commentCount)} yorumun tümünü gör
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});
