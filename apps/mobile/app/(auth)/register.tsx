import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AccountType } from '@unicampus/shared-types';
import { Screen } from '../../src/ui/Screen.js';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { OTPInput } from '../../src/ui/OTPInput.js';
import { StepIndicator } from '../../src/ui/StepIndicator.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { useAuthStore } from '../../src/lib/auth-store.js';
import { ApiError } from '../../src/lib/api.js';
import {
  register,
  searchUniversities,
  sendOtp,
  verifyOtp,
  type UniversityItem,
} from '../../src/features/auth/api.js';

const ACCOUNT_OPTIONS: { value: AccountType; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'student', label: 'Öğrenci', desc: 'Bireysel öğrenci hesabı', icon: 'person' },
  { value: 'club', label: 'Kulüp', desc: 'Onaylı kulüp hesabı', icon: 'people' },
  { value: 'team', label: 'Takım', desc: 'Spor/proje takımı', icon: 'trophy' },
];

export default function Register() {
  const router = useRouter();
  const { theme, spacing } = useTheme();
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step state
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [selectedUni, setSelectedUni] = useState<UniversityItem | null>(null);
  const [uniQuery, setUniQuery] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  function back() {
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  }

  async function handleUniSearch(q: string) {
    setUniQuery(q);
    try {
      const { items } = await searchUniversities(q);
      setUniversities(items);
    } catch {
      /* arama hatası sessiz */
    }
  }

  async function loadUniversitiesAndNext() {
    setLoading(true);
    try {
      const { items } = await searchUniversities('');
      setUniversities(items);
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!selectedUni) return;
    if (!email.trim()) {
      toast.show('E-posta gerekli', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(email.trim(), selectedUni.id);
      if (res.devCode) {
        setOtp(res.devCode);
        toast.show(`Dev kod: ${res.devCode}`, 'info');
      } else {
        toast.show('Kod gönderildi', 'success');
      }
      setStep(3);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Kod gönderilemedi';
      toast.show(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(code: string) {
    setLoading(true);
    try {
      const res = await verifyOtp(email.trim(), code);
      setVerificationToken(res.verificationToken);
      setStep(4);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Kod hatalı';
      toast.show(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (username.length < 3 || displayName.length < 2 || password.length < 8) {
      toast.show('Kullanıcı adı, isim ve şifre (min 8) gerekli', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        verificationToken,
        accountType,
        username,
        displayName,
        password,
        defaultFeedTab: 'social',
      });
      await setSession(result);
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Kayıt başarısız';
      toast.show(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing[3] }}>
          <Pressable onPress={back} hitSlop={10}>
            <Ionicons name="arrow-back" size={26} color={theme.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <StepIndicator total={5} current={step} />
          </View>
        </View>

        {step === 0 ? (
          <StepAccountType
            value={accountType}
            onSelect={setAccountType}
            onNext={loadUniversitiesAndNext}
            loading={loading}
          />
        ) : null}

        {step === 1 ? (
          <StepUniversity
            query={uniQuery}
            onSearch={handleUniSearch}
            universities={universities}
            selected={selectedUni}
            onSelect={(u) => {
              setSelectedUni(u);
              setStep(2);
            }}
          />
        ) : null}

        {step === 2 ? (
          <StepEmail
            university={selectedUni}
            email={email}
            onChangeEmail={setEmail}
            onNext={handleSendOtp}
            loading={loading}
          />
        ) : null}

        {step === 3 ? (
          <StepOtp
            email={email}
            otp={otp}
            onChange={setOtp}
            onComplete={handleVerifyOtp}
            onResend={handleSendOtp}
            loading={loading}
          />
        ) : null}

        {step === 4 ? (
          <StepProfile
            accountType={accountType}
            username={username}
            displayName={displayName}
            password={password}
            onChangeUsername={setUsername}
            onChangeDisplayName={setDisplayName}
            onChangePassword={setPassword}
            onFinish={handleRegister}
            loading={loading}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SelectCard({
  icon,
  label,
  desc,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: active ? theme.primary : theme.border,
        backgroundColor: active ? theme.primary + '11' : theme.surface,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.primary : theme.surface2,
        }}
      >
        <Ionicons name={icon} size={22} color={active ? '#fff' : theme.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="600">{label}</Text>
        <Text variant="caption" tone="muted">
          {desc}
        </Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
    </Pressable>
  );
}

function StepAccountType({
  value,
  onSelect,
  onNext,
  loading,
}: {
  value: AccountType;
  onSelect: (v: AccountType) => void;
  onNext: () => void;
  loading: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="headingLg">Hesap tipini seç</Text>
      <Text tone="muted">Nasıl bir hesap açmak istiyorsun?</Text>
      <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
        {ACCOUNT_OPTIONS.map((o) => (
          <SelectCard
            key={o.value}
            icon={o.icon}
            label={o.label}
            desc={o.desc}
            active={value === o.value}
            onPress={() => onSelect(o.value)}
          />
        ))}
      </View>
      <Button label="Devam" loading={loading} onPress={onNext} style={{ marginTop: spacing[2] }} />
    </View>
  );
}

function StepUniversity({
  query,
  onSearch,
  universities,
  selected,
  onSelect,
}: {
  query: string;
  onSearch: (q: string) => void;
  universities: UniversityItem[];
  selected: UniversityItem | null;
  onSelect: (u: UniversityItem) => void;
}) {
  const { spacing, theme, radius } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="headingLg">Üniversiteni seç</Text>
      <Input placeholder="Üniversite ara" leftIcon="search" value={query} onChangeText={onSearch} />
      <View style={{ gap: spacing[2] }}>
        {universities.map((u) => (
          <Pressable
            key={u.id}
            onPress={() => onSelect(u)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: selected?.id === u.id ? theme.primary : theme.border,
              backgroundColor: theme.surface,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text weight="600">{u.name}</Text>
              <Text variant="caption" tone="muted">
                {u.shortName ?? ''} {u.city ? `• ${u.city}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </Pressable>
        ))}
        {universities.length === 0 ? (
          <Text tone="muted" center style={{ marginTop: spacing[3] }}>
            Sonuç yok
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function StepEmail({
  university,
  email,
  onChangeEmail,
  onNext,
  loading,
}: {
  university: UniversityItem | null;
  email: string;
  onChangeEmail: (v: string) => void;
  onNext: () => void;
  loading: boolean;
}) {
  const { spacing } = useTheme();
  const hint = university?.domains?.length
    ? `Kabul edilen alan: ${university.domains.join(', ')}`
    : undefined;
  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="headingLg">Üniversite e-postan</Text>
      <Text tone="muted">{university?.name} öğrencisi olduğunu doğrulayalım.</Text>
      <Input
        label="E-posta"
        placeholder="ad@uni.edu.tr"
        keyboardType="email-address"
        leftIcon="mail-outline"
        value={email}
        onChangeText={onChangeEmail}
        hint={hint}
      />
      <Button label="Kod Gönder" loading={loading} onPress={onNext} />
    </View>
  );
}

function StepOtp({
  email,
  otp,
  onChange,
  onComplete,
  onResend,
  loading,
}: {
  email: string;
  otp: string;
  onChange: (v: string) => void;
  onComplete: (code: string) => void;
  onResend: () => void;
  loading: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing[4] }}>
      <View style={{ gap: spacing[1] }}>
        <Text variant="headingLg">Kodu gir</Text>
        <Text tone="muted">{email} adresine gönderdiğimiz 6 haneli kod.</Text>
      </View>
      <OTPInput value={otp} onChange={onChange} onComplete={onComplete} />
      {loading ? <ActivityIndicator style={{ marginTop: spacing[2] }} /> : null}
      <Button
        label="Kodu doğrula"
        loading={loading}
        onPress={() => onComplete(otp)}
        disabled={otp.length !== 6}
      />
      <Pressable onPress={onResend} style={{ alignItems: 'center' }}>
        <Text tone="brand">Kodu tekrar gönder</Text>
      </Pressable>
    </View>
  );
}

function StepProfile({
  accountType,
  username,
  displayName,
  password,
  onChangeUsername,
  onChangeDisplayName,
  onChangePassword,
  onFinish,
  loading,
}: {
  accountType: AccountType;
  username: string;
  displayName: string;
  password: string;
  onChangeUsername: (v: string) => void;
  onChangeDisplayName: (v: string) => void;
  onChangePassword: (v: string) => void;
  onFinish: () => void;
  loading: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="headingLg">Profilini oluştur</Text>
      <Input
        label={accountType === 'student' ? 'Ad Soyad' : 'Hesap adı'}
        placeholder="Örn. Ayşe Yılmaz"
        value={displayName}
        onChangeText={onChangeDisplayName}
      />
      <Input
        label="Kullanıcı adı"
        placeholder="kullanici_adi"
        leftIcon="at"
        value={username}
        onChangeText={(t) => onChangeUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
      />
      <Input
        label="Şifre"
        placeholder="En az 8 karakter"
        secure
        value={password}
        onChangeText={onChangePassword}
        leftIcon="lock-closed-outline"
      />

      <Button label="Kaydı Tamamla" loading={loading} onPress={onFinish} style={{ marginTop: spacing[2] }} />
    </View>
  );
}
