import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Conversation } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Avatar } from './Avatar.js';
import { relativeTime } from '../lib/format.js';

export function ConversationListItem({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress?: () => void;
}) {
  const { theme, spacing } = useTheme();
  const title =
    conversation.type === 'group'
      ? conversation.title ?? 'Grup'
      : conversation.peer?.displayName ?? 'Sohbet';
  const unread = conversation.unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingHorizontal: spacing[3],
        paddingVertical: 10,
      }}
    >
      {conversation.type === 'group' ? (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: theme.surface3,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="people" size={24} color={theme.textMuted} />
        </View>
      ) : (
        <Avatar
          uri={conversation.peer?.avatarUrl}
          name={conversation.peer?.displayName}
          size={52}
          verified={conversation.peer?.isVerifiedStudent}
        />
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text weight="600" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </Text>
          {conversation.lastMessageAt ? (
            <Text variant="micro" tone={unread ? 'brand' : 'muted'}>
              {relativeTime(conversation.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text variant="caption" tone={unread ? 'secondary' : 'muted'} numberOfLines={1} style={{ flex: 1 }}>
            {conversation.lastMessagePreview ?? 'Henüz mesaj yok'}
          </Text>
          {unread ? (
            <View
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                paddingHorizontal: 6,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="micro" style={{ color: '#fff', fontWeight: '700' }}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
