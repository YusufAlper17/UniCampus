import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/lib/theme.js';
import { useAuthStore } from '../../src/lib/auth-store.js';
import { getMe } from '../../src/features/users/api.js';

export default function TabsLayout() {
  const { theme, setPref } = useTheme();
  const accessToken = useAuthStore((s) => s.accessToken);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  useEffect(() => {
    const serverTheme = meQuery.data?.preferences?.theme;
    if (serverTheme) setPref(serverTheme);
  }, [meQuery.data?.preferences?.theme, setPref]);

  if (!accessToken) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Akış',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                shadowColor: theme.primary,
                shadowOpacity: 0.4,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Ionicons name="add" size={30} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Topluluk',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="activity" options={{ href: null }} />
    </Tabs>
  );
}
