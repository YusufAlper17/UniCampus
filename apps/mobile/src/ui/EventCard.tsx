import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventData } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Button } from './Button.js';

interface EventCardProps {
  event: EventData;
  onJoin?: () => void;
  joining?: boolean;
}

export function EventCard({ event, onJoin, joining }: EventCardProps) {
  const { theme, radius, spacing } = useTheme();
  const start = new Date(event.startsAt);
  const dateText = start.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const joined = event.myStatus === 'joined';
  const isFull = event.capacity != null && event.participantCount >= event.capacity;
  const joinLabel = joined
    ? 'Katılıyorsun'
    : isFull
      ? 'Dolu'
      : event.myStatus === 'pending'
        ? 'İstek beklemede'
        : event.participationType === 'approval'
          ? 'Katılma isteği gönder'
          : 'Katıl';

  return (
    <View
      style={{
        marginTop: 4,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: theme.border,
        padding: spacing[3],
        gap: 8,
        backgroundColor: theme.surface2,
      }}
    >
      <Row icon="calendar" text={dateText} theme={theme} />
      {event.locationText ? <Row icon="location" text={event.locationText} theme={theme} /> : null}
      <Row
        icon="people"
        text={`${event.participantCount}${event.capacity != null ? ` / ${event.capacity}` : ''} katılımcı`}
        theme={theme}
      />
      <Row
        icon={event.isPaid ? 'card' : 'pricetag'}
        text={event.isPaid ? `Ücretli${event.price ? ` · ${event.price}₺` : ''}` : 'Ücretsiz'}
        theme={theme}
      />
      <Button
        label={joinLabel}
        size="sm"
        variant={joined ? 'secondary' : 'primary'}
        disabled={joined || isFull}
        loading={joining}
        onPress={onJoin}
      />
    </View>
  );
}

function Row({
  icon,
  text,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={16} color={theme.textMuted} />
      <Text variant="caption" tone="secondary">
        {text}
      </Text>
    </View>
  );
}
