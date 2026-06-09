import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { EventData } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Button } from './Button.js';
import { compactNumber } from '../lib/format.js';

interface EventCardProps {
  event: EventData;
  onJoin?: () => void;
  joining?: boolean;
  onPressAttendees?: () => void;
}

const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function EventCard({ event, onJoin, joining, onPressAttendees }: EventCardProps) {
  const { theme, radius, spacing } = useTheme();
  const start = new Date(event.startsAt);
  const day = start.getDate();
  const month = MONTHS_SHORT[start.getMonth()];
  const timeText = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const weekday = start.toLocaleDateString('tr-TR', { weekday: 'long' });

  const joined = event.myStatus === 'joined';
  const isFull = event.capacity != null && event.participantCount >= event.capacity;
  const joinLabel = joined
    ? 'Katılıyorsun ✓'
    : isFull
      ? 'Kontenjan Dolu'
      : event.myStatus === 'pending'
        ? 'İstek beklemede'
        : event.participationType === 'approval'
          ? 'Katılma isteği gönder'
          : 'Katıl';

  const attendees = event.attendees ?? [];
  const showAttendees = event.attendeesVisible !== false && attendees.length > 0;
  const visibleAttendees = attendees.slice(0, 4);
  const extraCount = Math.max(0, event.participantCount - visibleAttendees.length);
  const fillPct =
    event.capacity != null ? Math.min(100, Math.round((event.participantCount / event.capacity) * 100)) : null;

  return (
    <View
      style={{
        marginTop: 4,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing[3], padding: spacing[3] }}>
        {/* Tarih bloğu */}
        <View
          style={{
            width: 58,
            borderRadius: radius.md,
            backgroundColor: theme.primary + '14',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing[2],
          }}
        >
          <Text variant="micro" weight="700" tone="brand" style={{ textTransform: 'uppercase' }}>
            {month}
          </Text>
          <Text weight="800" style={{ fontSize: 22, lineHeight: 26, color: theme.primary }}>
            {day}
          </Text>
        </View>

        {/* Bilgi */}
        <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
          {event.title ? (
            <Text weight="700" numberOfLines={2}>
              {event.title}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="time-outline" size={13} color={theme.textMuted} />
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {weekday}, {timeText}
            </Text>
          </View>
          {event.locationText ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="location-outline" size={13} color={theme.textMuted} />
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {event.locationText}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Ücret rozeti */}
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: event.isPaid ? theme.warning + '22' : theme.success + '22',
          }}
        >
          <Text variant="micro" weight="700" style={{ color: event.isPaid ? theme.warning : theme.success }}>
            {event.isPaid ? `${event.price ?? ''}₺` : 'Ücretsiz'}
          </Text>
        </View>
      </View>

      {/* Katılımcılar */}
      <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[2] }}>
        <Pressable
          onPress={onPressAttendees}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
        >
          {showAttendees ? (
            <View style={{ flexDirection: 'row' }}>
              {visibleAttendees.map((a, i) => (
                <View
                  key={a.id}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    marginLeft: i === 0 ? 0 : -9,
                    borderWidth: 2,
                    borderColor: theme.surface,
                    overflow: 'hidden',
                    backgroundColor: theme.surface3,
                  }}
                >
                  {a.avatarUrl ? (
                    <Image source={{ uri: a.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Ionicons name="people-outline" size={16} color={theme.textMuted} />
          )}
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            <Text variant="caption" weight="700">
              {compactNumber(event.participantCount)}
            </Text>
            {event.capacity != null ? ` / ${compactNumber(event.capacity)}` : ''} katılımcı
            {showAttendees && extraCount > 0 ? ` · +${compactNumber(extraCount)} kişi` : ''}
          </Text>
          {showAttendees ? <Ionicons name="chevron-forward" size={14} color={theme.textMuted} /> : null}
        </Pressable>

        {/* Doluluk çubuğu */}
        {fillPct != null ? (
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.surface3,
              marginTop: spacing[2],
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${fillPct}%`,
                height: '100%',
                borderRadius: 2,
                backgroundColor: fillPct >= 90 ? theme.danger : theme.primary,
              }}
            />
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[3] }}>
        <Button
          label={joinLabel}
          size="sm"
          variant={joined ? 'secondary' : 'primary'}
          disabled={joined || isFull}
          loading={joining}
          onPress={onJoin}
        />
      </View>
    </View>
  );
}
