import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface MessageBubbleProps {
  content?: string;
  mediaUrl?: string;
  mine: boolean;
  time: string;
  read?: boolean;
  showRead?: boolean;
  viewOnce?: boolean;
  viewed?: boolean;
  onView?: () => void;
}

export function MessageBubble({
  content,
  mediaUrl,
  mine,
  time,
  read,
  showRead,
  viewOnce,
  viewed,
  onView,
}: MessageBubbleProps) {
  const { theme, radius } = useTheme();
  const fg = mine ? '#fff' : theme.textPrimary;
  const muted = mine ? 'rgba(255,255,255,0.7)' : theme.textMuted;

  // Tek görüntülemelik medya: gönderen ve alıcı için durum kutusu.
  const viewOnceBox = viewOnce ? (
    mine ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="flame" size={16} color={fg} />
        <Text style={{ color: fg }}>Tek görüntülemelik</Text>
      </View>
    ) : viewed ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="eye-off-outline" size={16} color={muted} />
        <Text style={{ color: muted }}>Açıldı</Text>
      </View>
    ) : (
      <Pressable onPress={onView} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="flame" size={16} color={fg} />
        <Text style={{ color: fg, fontWeight: '600' }}>Görüntülemek için dokun</Text>
      </Pressable>
    )
  ) : null;

  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
        marginVertical: 3,
        marginHorizontal: 12,
        backgroundColor: mine ? theme.primary : theme.surface2,
        borderRadius: radius.lg,
        borderBottomRightRadius: mine ? 4 : radius.lg,
        borderBottomLeftRadius: mine ? radius.lg : 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
      }}
    >
      {viewOnceBox}
      {!viewOnce && mediaUrl ? (
        <Image
          source={{ uri: mediaUrl }}
          style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: theme.surface3 }}
          contentFit="cover"
          transition={150}
        />
      ) : null}
      {!viewOnce && content ? (
        <Text style={{ color: fg, lineHeight: 21 }}>{content}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' }}>
        <Text variant="micro" style={{ color: muted }}>
          {time}
        </Text>
        {mine && showRead ? (
          <Ionicons
            name={read ? 'checkmark-done' : 'checkmark'}
            size={14}
            color={read ? '#7DD3FC' : 'rgba(255,255,255,0.7)'}
          />
        ) : null}
      </View>
    </View>
  );
}
