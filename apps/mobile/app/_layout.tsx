import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { ThemeProvider } from '../src/lib/theme.js';
import { ToastProvider } from '../src/ui/Toast.js';
import { useAuthStore } from '../src/lib/auth-store.js';
import { useRealtimeBridge } from '../src/lib/realtime.js';
import { useRegisterPush } from '../src/lib/push.js';

function RealtimeBridge() {
  useRealtimeBridge();
  useRegisterPush();
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({ Pacifico_400Regular });

  useEffect(() => {
    void hydrate().finally(() => setReady(true));
  }, [hydrate]);

  if (!ready || !fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <RealtimeBridge />
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="settings" options={{ headerShown: true }} />
                <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Gizlilik' }} />
                <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Bildirimler' }} />
                <Stack.Screen name="security" options={{ headerShown: true, title: 'Güvenlik' }} />
                <Stack.Screen name="edit-profile" options={{ headerShown: true }} />
                <Stack.Screen name="close-friends" options={{ headerShown: true, title: 'Yakın Arkadaşlar' }} />
                <Stack.Screen name="story/[userId]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                <Stack.Screen
                  name="story/create"
                  options={{ headerShown: true, title: 'Story Ekle', presentation: 'modal' }}
                />
                <Stack.Screen name="reels" options={{ headerShown: false }} />
                <Stack.Screen
                  name="reel/create"
                  options={{ headerShown: true, title: 'Reel Paylaş', presentation: 'modal' }}
                />
                <Stack.Screen name="project/[id]" options={{ headerShown: true, title: 'Proje' }} />
                <Stack.Screen
                  name="compose/event"
                  options={{ headerShown: true, title: 'Etkinlik Oluştur', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="compose/poll"
                  options={{ headerShown: true, title: 'Anket Oluştur', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="compose/project"
                  options={{ headerShown: true, title: 'Proje Paylaş', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="compose/milestone"
                  options={{ headerShown: true, title: 'Başarı Paylaş', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="compose/opportunity"
                  options={{ headerShown: true, title: 'Fırsat İlanı', presentation: 'modal' }}
                />
              </Stack>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
