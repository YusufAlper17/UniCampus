import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme.js';
import { Text } from '../Text.js';
import { Avatar } from '../Avatar.js';

export interface ProfileHeaderProps {
  displayName: string;
  username: string;
  avatarUrl?: string;
  verified?: boolean;
  isPrivate?: boolean;
  careerHeadline?: string;
  statusText?: string;
  statusEmoji?: string;
  bio?: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
}

export function ProfileHeader({
  displayName,
  username,
  avatarUrl,
  verified,
  isPrivate,
  careerHeadline,
  statusText,
  statusEmoji,
  bio,
  subtitle,
  actions,
  footer,
}: ProfileHeaderProps) {
  const { theme, spacing } = useTheme();

  return (
    <View>
      <View style={{ height: 100, backgroundColor: theme.primary + '12' }} />

      <View style={{ paddingHorizontal: spacing[3], marginTop: -52 }}>
        <Avatar uri={avatarUrl} name={displayName} size={96} verified={verified} />

        <View style={{ marginTop: spacing[3], gap: spacing[1] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text variant="headingMd" weight="700">
              {displayName}
            </Text>
            {isPrivate ? <Ionicons name="lock-closed" size={14} color={theme.textMuted} /> : null}
          </View>

          <Text variant="caption" tone="muted">
            @{username}
          </Text>

          {subtitle ? (
            <Text variant="caption" tone="secondary">
              {subtitle}
            </Text>
          ) : careerHeadline ? (
            <Text variant="caption" tone="secondary">
              {careerHeadline}
            </Text>
          ) : null}

          {statusText ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: theme.success,
                }}
              />
              {statusEmoji ? <Text variant="caption">{statusEmoji}</Text> : null}
              <Text variant="caption" tone="secondary">
                {statusText}
              </Text>
            </View>
          ) : null}

          {bio ? (
            <Text tone="secondary" numberOfLines={3} style={{ lineHeight: 22, marginTop: 4 }}>
              {bio}
            </Text>
          ) : null}
        </View>

        {footer ? <View style={{ marginTop: spacing[3] }}>{footer}</View> : null}
        {actions ? <View style={{ marginTop: spacing[3], gap: spacing[2] }}>{actions}</View> : null}
      </View>
    </View>
  );
}
