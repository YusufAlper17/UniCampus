import { Pressable, View } from 'react-native';
import { useTheme } from '../../lib/theme.js';
import { Text } from '../Text.js';
import { compactNumber } from '../../lib/format.js';

interface ProfileStatsRowProps {
  postCount: number;
  followerCount: number;
  followingCount: number;
  onPostsPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
}

export function ProfileStatsRow({
  postCount,
  followerCount,
  followingCount,
  onPostsPress,
  onFollowersPress,
  onFollowingPress,
}: ProfileStatsRowProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
      }}
    >
      <StatCell label="Gönderi" value={postCount} onPress={onPostsPress} />
      <View style={{ width: 1, height: 28, backgroundColor: theme.border }} />
      <StatCell label="Takipçi" value={followerCount} onPress={onFollowersPress} />
      <View style={{ width: 1, height: 28, backgroundColor: theme.border }} />
      <StatCell label="Takip" value={followingCount} onPress={onFollowingPress} />
    </View>
  );
}

function StatCell({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <Text weight="700" variant="headingMd">
        {compactNumber(value)}
      </Text>
      <Text variant="micro" tone="muted">
        {label}
      </Text>
    </>
  );

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      {onPress ? (
        <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 2 }}>
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </View>
  );
}
