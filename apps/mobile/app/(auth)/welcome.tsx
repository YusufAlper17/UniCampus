import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Button } from '../../src/ui/Button.js';
import { useTheme } from '../../src/lib/theme.js';

export default function Welcome() {
  const router = useRouter();
  const { theme, spacing } = useTheme();

  return (
    <Screen contentStyle={{ justifyContent: 'space-between', paddingVertical: spacing[5] }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing[3] }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: theme.primary,
            shadowOpacity: 0.4,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Ionicons name="school" size={52} color="#FFFFFF" />
        </View>
        <Text variant="headingXl" center>
          UniCampus
        </Text>
        <Text tone="muted" center style={{ maxWidth: 300 }}>
          Kampüsün nabzı tek yerde: paylaş, etkinliklere katıl, toplulukları keşfet. Sadece doğrulanmış öğrenciler.
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
          <Feature icon="people" label="Topluluk" theme={theme} />
          <Feature icon="calendar" label="Etkinlik" theme={theme} />
          <Feature icon="shield-checkmark" label="Güvenli" theme={theme} />
        </View>
      </View>

      <View style={{ gap: spacing[2] }}>
        <Button label="Hesap Oluştur" onPress={() => router.push('/(auth)/register')} />
        <Button
          label="Giriş Yap"
          variant="outline"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    </Screen>
  );
}

function Feature({
  icon,
  label,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.surface2,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 18,
      }}
    >
      <Ionicons name={icon} size={22} color={theme.primary} />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}
