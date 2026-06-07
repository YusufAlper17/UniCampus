import { Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InviteLink } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { Button } from './Button.js';

export function InviteLinkSheet({ invite }: { invite: InviteLink }) {
  const { theme, spacing, radius } = useTheme();

  async function share() {
    try {
      await Share.share({ message: `UniCampus topluluğuna katıl: ${invite.url}` });
    } catch {
      /* kullanıcı iptal etti */
    }
  }

  return (
    <View style={{ gap: spacing[2] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: theme.surface2,
          borderRadius: radius.md,
          padding: spacing[3],
        }}
      >
        <Ionicons name="link" size={16} color={theme.textMuted} />
        <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
          {invite.url}
        </Text>
      </View>
      {invite.maxUses != null ? (
        <Text variant="micro" tone="muted">
          {invite.useCount}/{invite.maxUses} kullanım
        </Text>
      ) : null}
      <Button label="Linki Paylaş" icon={<Ionicons name="share-social" size={18} color="#fff" />} onPress={share} />
    </View>
  );
}
