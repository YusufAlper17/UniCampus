import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { login } from '../../src/features/auth/api.js';
import { useAuthStore } from '../../src/lib/auth-store.js';
import { ApiError } from '../../src/lib/api.js';

export default function Login() {
  const router = useRouter();
  const { spacing, theme } = useTheme();
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      toast.show('E-posta ve şifre gerekli', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      await setSession(result);
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Giriş başarısız';
      toast.show(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginBottom: spacing[3] }}>
          <Ionicons name="arrow-back" size={26} color={theme.textPrimary} />
        </Pressable>

        <Text variant="headingXl">Tekrar hoş geldin</Text>
        <Text tone="muted" style={{ marginBottom: spacing[4] }}>
          Üniversite hesabınla giriş yap.
        </Text>

        <View style={{ gap: spacing[3] }}>
          <Input
            label="Üniversite e-postası"
            placeholder="ad@uni.edu.tr"
            keyboardType="email-address"
            leftIcon="mail-outline"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Şifre"
            placeholder="••••••••"
            leftIcon="lock-closed-outline"
            secure
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => toast.show('Şifre sıfırlama yakında', 'info')}>
            <Text tone="brand" variant="caption" style={{ textAlign: 'right' }}>
              Şifremi unuttum
            </Text>
          </Pressable>
          <Button label="Giriş Yap" loading={loading} onPress={handleLogin} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing[4], gap: 4 }}>
          <Text tone="muted">Hesabın yok mu?</Text>
          <Pressable onPress={() => router.replace('/(auth)/register')}>
            <Text tone="brand" weight="600">
              Kayıt ol
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
