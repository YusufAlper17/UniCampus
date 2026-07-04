import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { CommunityVisibility, JoinMode } from '@unicampus/shared-types';
import { Text } from '../../src/ui/Text.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createCommunity } from '../../src/features/communities/api.js';
import { ApiError } from '../../src/lib/api.js';

const CATEGORIES = [
  'Teknoloji',
  'Kariyer',
  'Yapay Zekâ',
  'Mühendislik',
  'Sanat',
  'Müzik',
  'Spor',
  'Doğa Sporları',
  'Girişimcilik',
  'Finans',
  'Çevre',
  'Uluslararası',
];

const VISIBILITY_OPTIONS: {
  value: CommunityVisibility;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
}[] = [
  { value: 'public', icon: 'globe-outline', title: 'Açık', hint: 'Keşfette görünür, herkes bulabilir.' },
  { value: 'unlisted', icon: 'link-outline', title: 'Link ile', hint: 'Yalnızca linki olanlar bulur.' },
  { value: 'private', icon: 'lock-closed-outline', title: 'Gizli', hint: 'Sadece üyeler içeriği görür.' },
];

const JOIN_OPTIONS: {
  value: JoinMode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
}[] = [
  { value: 'open', icon: 'flash-outline', title: 'Herkese açık', hint: 'İsteyen anında katılır.' },
  { value: 'request', icon: 'shield-checkmark-outline', title: 'Onaylı', hint: 'Katılım yönetici onayı ister.' },
  { value: 'invite', icon: 'mail-outline', title: 'Davetle', hint: 'Yalnızca davet linkiyle katılınır.' },
];

export default function CreateCommunity() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<CommunityVisibility>('public');
  const [joinMode, setJoinMode] = useState<JoinMode>('request');
  const [saving, setSaving] = useState(false);

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  async function submit() {
    if (name.trim().length < 2) {
      toast.show('Topluluk adı en az 2 karakter', 'error');
      return;
    }
    setSaving(true);
    try {
      const { community } = await createCommunity({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category ?? undefined,
        type: 'group',
        visibility,
        joinMode,
      });
      await qc.invalidateQueries({ queryKey: ['communities'] });
      toast.show('Topluluk oluşturuldu', 'success');
      router.replace(`/community/${community.id}`);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Oluşturulamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: spacing[3], paddingBottom: spacing[6], gap: spacing[4] }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Topluluk Oluştur', headerShown: true }} />

      {/* Canlı önizleme */}
      <View style={{ alignItems: 'center', gap: spacing[2], paddingTop: spacing[2] }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            backgroundColor: theme.primary + '16',
            borderWidth: 1.5,
            borderColor: theme.primary + '33',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {initials ? (
            <Text variant="headingLg" weight="800" style={{ color: theme.primary }}>
              {initials}
            </Text>
          ) : (
            <Ionicons name="people" size={36} color={theme.primary} />
          )}
        </View>
        <Text variant="headingMd" weight="700" numberOfLines={1}>
          {name.trim() || 'Yeni Topluluk'}
        </Text>
        {category ? (
          <Text variant="caption" tone="brand" weight="600">
            {category}
          </Text>
        ) : (
          <Text variant="caption" tone="muted">
            Kampüsünde bir araya getir
          </Text>
        )}
      </View>

      {/* Temel bilgiler */}
      <View style={{ gap: spacing[3] }}>
        <SectionLabel text="Temel bilgiler" />
        <Input
          label="Topluluk adı"
          placeholder="Örn. Yapay Zeka Kulübü"
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
          maxLength={48}
        />
        <View style={{ gap: 6 }}>
          <Text variant="caption" tone="secondary">
            Açıklama
          </Text>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: theme.border,
              borderRadius: radius.md,
              backgroundColor: theme.surface,
              paddingHorizontal: 14,
              paddingVertical: 10,
              minHeight: 88,
            }}
          >
            <TextInput
              placeholder="Topluluk ne hakkında? Kimler katılmalı?"
              placeholderTextColor={theme.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
              autoCapitalize="sentences"
              style={{ color: theme.textPrimary, fontSize: 16, minHeight: 66, textAlignVertical: 'top' }}
            />
          </View>
          <Text variant="micro" tone="muted" style={{ alignSelf: 'flex-end' }}>
            {description.length}/200
          </Text>
        </View>
      </View>

      {/* Kategori */}
      <View style={{ gap: spacing[2] }}>
        <SectionLabel text="Kategori" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(active ? null : cat)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? theme.primary : theme.surface,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                }}
              >
                <Text variant="caption" weight={active ? '700' : '500'} style={{ color: active ? '#fff' : theme.textSecondary }}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Görünürlük */}
      <View style={{ gap: spacing[2] }}>
        <SectionLabel text="Görünürlük" />
        {VISIBILITY_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            hint={opt.hint}
            active={visibility === opt.value}
            onPress={() => setVisibility(opt.value)}
          />
        ))}
      </View>

      {/* Katılım */}
      <View style={{ gap: spacing[2] }}>
        <SectionLabel text="Katılım şekli" />
        {JOIN_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            hint={opt.hint}
            active={joinMode === opt.value}
            onPress={() => setJoinMode(opt.value)}
          />
        ))}
      </View>

      <Button
        label="Topluluğu Oluştur"
        loading={saving}
        onPress={submit}
        disabled={name.trim().length < 2}
        style={{ marginTop: spacing[1] }}
      />
    </ScrollView>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text variant="micro" tone="muted" weight="700" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
      {text}
    </Text>
  );
}

function OptionCard({
  icon,
  title,
  hint,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
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
        gap: 12,
        padding: 14,
        borderRadius: radius.lg,
        backgroundColor: active ? theme.primary + '0F' : theme.surface,
        borderWidth: 1.5,
        borderColor: active ? theme.primary : theme.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: active ? theme.primary + '1A' : theme.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={active ? theme.primary : theme.textMuted} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text weight="700" style={{ fontSize: 15 }}>
          {title}
        </Text>
        <Text variant="micro" tone="muted">
          {hint}
        </Text>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: active ? theme.primary : theme.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {active ? <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: theme.primary }} /> : null}
      </View>
    </Pressable>
  );
}
