import { View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../lib/theme.js';
import { Skeleton } from '../Skeleton.js';

export function ProfileScreenSkeleton() {
  const { theme, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const cell = (width - 2) / 3;

  return (
    <View>
      <View style={{ height: 100, backgroundColor: theme.primary + '12' }} />
      <View style={{ paddingHorizontal: spacing[3], marginTop: -52, gap: spacing[3] }}>
        <Skeleton width={96} height={96} radius={48} />
        <View style={{ gap: 8 }}>
          <Skeleton height={20} width="55%" />
          <Skeleton height={14} width="35%" />
          <Skeleton height={14} width="80%" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Skeleton height={22} width={40} />
              <Skeleton height={12} width={48} />
            </View>
          ))}
        </View>
        <Skeleton height={44} radius={12} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, marginTop: spacing[3] }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} width={cell} height={cell} radius={0} />
        ))}
      </View>
    </View>
  );
}
