import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/lib/auth-store.js';

// Splash sonrası yönlendirme: oturum varsa ana sekmeler, yoksa karşılama.
export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return <Redirect href={accessToken ? '/(tabs)' : '/(auth)/welcome'} />;
}
