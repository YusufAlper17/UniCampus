import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AccountVisibility } from '@unicampus/shared-types';
import { Screen } from '../src/ui/Screen.js';
import { Text } from '../src/ui/Text.js';
import { Input } from '../src/ui/Input.js';
import { Button } from '../src/ui/Button.js';
import { useToast } from '../src/ui/Toast.js';
import { useTheme } from '../src/lib/theme.js';
import { getMe, updateFeaturedCommunities, updateProfile, updateStatus } from '../src/features/users/api.js';
import { getCommunities } from '../src/features/communities/api.js';
import { ApiError } from '../src/lib/api.js';

const STATUS_EMOJIS = ['😀', '📚', '💻', '☕', '🎯', '🔥', '😴', '🎧', '🏀', '✈️'];

export default function EditProfile() {
  const router = useRouter();
  const { theme, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const mineQuery = useQuery({ queryKey: ['communities', 'mine'], queryFn: () => getCommunities({ mine: true }) });

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [careerHeadline, setCareerHeadline] = useState('');
  const [statusEmoji, setStatusEmoji] = useState('');
  const [statusText, setStatusText] = useState('');
  const [visibility, setVisibility] = useState<AccountVisibility>('public');
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setDisplayName(data.user.displayName);
      setBio(data.user.bio ?? '');
      setCareerHeadline(data.user.careerHeadline ?? '');
      setStatusEmoji(data.user.statusEmoji ?? '');
      setStatusText(data.user.statusText ?? '');
      setVisibility(data.user.accountVisibility);
      setFeaturedIds((data.featuredCommunities ?? []).map((c) => c.id));
    }
  }, [data]);

  function toggleCommunity(id: string) {
    setFeaturedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  }

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ displayName, bio, careerHeadline, accountVisibility: visibility });
      await updateStatus({
        statusText: statusText.trim() || null,
        statusEmoji: statusText.trim() ? statusEmoji || null : null,
      });
      await updateFeaturedCommunities(featuredIds);
      await qc.invalidateQueries({ queryKey: ['me'] });
      toast.show('Profil güncellendi', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Güncellenemedi', 'error');
    } finally {
      setSaving(false);
    }
  }

  const myCommunities = mineQuery.data?.items ?? [];

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Profili Düzenle' }} />
      <View style={{ gap: spacing[3] }}>
        <Text variant="headingLg">Profili Düzenle</Text>
        <Input label="Ad Soyad" value={displayName} onChangeText={setDisplayName} />
        <Input label="Biyografi" value={bio} onChangeText={setBio} placeholder="Kendinden bahset" multiline />
        <Input
          label="Başlık"
          value={careerHeadline}
          onChangeText={setCareerHeadline}
          placeholder="Örn. Bilgisayar Müh. öğrencisi"
          leftIcon="school-outline"
        />

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" tone="muted">
            Profilde gösterilecek topluluklar (en fazla 6)
          </Text>
          {myCommunities.length ? (
            myCommunities.map((c) => {
              const selected = featuredIds.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggleCommunity(c.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primary + '10' : theme.surface2,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: theme.primary + '22',
                    }}
                  >
                    {c.avatarUrl ? (
                      <Image source={{ uri: c.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="people" size={18} color={theme.primary} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text weight="600">{c.name}</Text>
                    <Text variant="caption" tone="muted">
                      {c.category ?? 'Topluluk'}
                    </Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
                </Pressable>
              );
            })
          ) : (
            <Text variant="caption" tone="muted">
              Henüz üye olduğun topluluk yok. Keşfet sekmesinden katılabilirsin.
            </Text>
          )}
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" tone="muted">
            Durum
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STATUS_EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setStatusEmoji((cur) => (cur === e ? '' : e))}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: statusEmoji === e ? 2 : 1,
                  borderColor: statusEmoji === e ? theme.primary : theme.border,
                  backgroundColor: statusEmoji === e ? theme.primary + '18' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Input
            value={statusText}
            onChangeText={setStatusText}
            placeholder="Ne yapıyorsun? (örn. Final haftası)"
            maxLength={80}
          />
        </View>

        <Pressable
          onPress={() => setVisibility((v) => (v === 'public' ? 'private' : 'public'))}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons
              name={visibility === 'private' ? 'lock-closed' : 'globe-outline'}
              size={20}
              color={theme.textPrimary}
            />
            <View>
              <Text weight="600">{visibility === 'private' ? 'Gizli hesap' : 'Açık hesap'}</Text>
              <Text variant="caption" tone="muted">
                {visibility === 'private' ? 'Sadece onayladıkların takip eder' : 'Herkes takip edebilir'}
              </Text>
            </View>
          </View>
          <View
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: visibility === 'private' ? theme.primary : theme.surface3,
              padding: 3,
              alignItems: visibility === 'private' ? 'flex-end' : 'flex-start',
            }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
          </View>
        </Pressable>

        <Button label="Kaydet" loading={saving} onPress={save} style={{ marginTop: spacing[2] }} />
      </View>
    </Screen>
  );
}
