import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth-store.js';

export default function AuthLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
