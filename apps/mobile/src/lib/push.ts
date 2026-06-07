import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuthStore } from './auth-store.js';
import { registerDevice } from '../features/messaging/api.js';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function obtainAndRegister(): Promise<void> {
  if (!Device.isDevice) return; // Simülatörde push token alınamaz.

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Genel',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  await registerDevice(token.data);
}

/**
 * Oturum açıkken Expo push token'ını alıp backend'e kaydeder.
 * İzin reddedilirse veya cihaz fiziksel değilse sessizce atlanır.
 */
export function useRegisterPush(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  useEffect(() => {
    if (!accessToken) return;
    obtainAndRegister().catch(() => {
      /* push opsiyonel; sessiz geç */
    });
  }, [accessToken]);
}
