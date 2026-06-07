import { memo } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Badge } from './Badge.js';
import { api } from '../lib/api.js';

interface AdCardProps {
  campaignId: string;
  mediaUrl: string;
  ctaText: string;
  targetUrl: string;
}

export const AdCard = memo(function AdCard({ campaignId, mediaUrl, ctaText, targetUrl }: AdCardProps) {
  const { theme, spacing } = useTheme();

  async function onPress() {
    void api.post('/ads/click', { campaignId }).catch(() => undefined);
    if (targetUrl) void Linking.openURL(targetUrl);
  }

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
      <Badge label="Sponsorlu" tone="neutral" />
      <Image source={{ uri: mediaUrl }} style={{ width: '100%', height: 200, borderRadius: 12 }} contentFit="cover" />
      <Pressable
        onPress={onPress}
        style={{
          alignSelf: 'flex-start',
          backgroundColor: theme.primary,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          borderRadius: 8,
        }}
      >
        <Text variant="caption" style={{ color: '#FFF', fontWeight: '600' }}>
          {ctaText}
        </Text>
      </Pressable>
    </Pressable>
  );
});
