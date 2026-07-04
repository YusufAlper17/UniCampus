import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme.js';

export type ProfileContentTab = 'posts' | 'projects' | 'saved';

export interface ProfileTabItem {
  id: ProfileContentTab;
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
}

interface ProfileContentTabsProps {
  tabs: ProfileTabItem[];
  active: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
}

export function ProfileContentTabs({ tabs, active, onChange }: ProfileContentTabsProps) {
  const { theme, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: theme.border,
        marginTop: spacing[1],
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: spacing[2],
              borderBottomWidth: 2,
              borderBottomColor: isActive ? theme.textPrimary : 'transparent',
            }}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? theme.textPrimary : theme.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
