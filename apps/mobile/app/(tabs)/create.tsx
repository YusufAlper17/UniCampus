import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { ContentDomain } from '@unicampus/shared-types';
import { Text } from '../../src/ui/Text.js';
import { Button } from '../../src/ui/Button.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createPost } from '../../src/features/posts/api.js';
import { ApiError } from '../../src/lib/api.js';

export default function CreateTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  // Domain ilk adımda seçilir ve değiştirilemez (sızıntı önlemi).
  const [domain, setDomain] = useState<ContentDomain | null>(null);
  const [kind, setKind] = useState<'text' | null>(null);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  function reset() {
    setDomain(null);
    setKind(null);
    setContent('');
  }

  function goCompose(route: string) {
    reset();
    router.push(route as never);
  }

  async function submit() {
    if (!domain || !content.trim()) return;
    setPosting(true);
    try {
      await createPost({ contentDomain: domain, content: content.trim() });
      await qc.invalidateQueries({ queryKey: ['feed', domain] });
      await qc.invalidateQueries({ queryKey: ['trending'] });
      toast.show('Paylaşıldı', 'success');
      reset();
      router.replace('/(tabs)');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setPosting(false);
    }
  }

  if (!domain) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ padding: spacing[3], gap: spacing[3], flex: 1 }}>
          <Text variant="headingLg">Ne paylaşmak istersin?</Text>
          <Text tone="muted">Önce evreni seç. Sosyal ve kariyer içerikleri ayrı akışlarda görünür.</Text>

          <DomainChoice
            icon="sparkles"
            title="Sosyal"
            desc="Gönderi, fotoğraf, etkinlik, anket"
            color={theme.primary}
            onPress={() => setDomain('social')}
          />
          <DomainChoice
            icon="briefcase"
            title="Kariyer"
            desc="Proje, başarı, fırsat — reklamsız akış"
            color={theme.info}
            onPress={() => setDomain('career')}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!kind) {
    const isSocial = domain === 'social';
    const accent = isSocial ? theme.primary : theme.info;
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ padding: spacing[3], gap: spacing[3], flex: 1 }}>
          <Pressable onPress={reset} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
            <Text tone="secondary">Geri</Text>
          </Pressable>
          <Text variant="headingLg">{isSocial ? 'Sosyal paylaşım' : 'Kariyer paylaşımı'}</Text>

          <DomainChoice icon="create" title="Gönderi" desc="Yazı ve fotoğraf" color={accent} onPress={() => setKind('text')} />
          {isSocial ? (
            <>
              <DomainChoice icon="calendar" title="Etkinlik" desc="Tarih, konum, katılım" color={accent} onPress={() => goCompose('/compose/event')} />
              <DomainChoice icon="stats-chart" title="Anket" desc="Soru + seçenekler" color={accent} onPress={() => goCompose('/compose/poll')} />
            </>
          ) : (
            <>
              <DomainChoice icon="rocket" title="Proje" desc="Showcase + tech stack" color={accent} onPress={() => goCompose('/compose/project')} />
              <DomainChoice icon="trophy" title="Başarı" desc="Milestone paylaş" color={accent} onPress={() => goCompose('/compose/milestone')} />
              <DomainChoice icon="megaphone" title="Fırsat" desc="Staj/iş ilanı (moderasyonlu)" color={accent} onPress={() => goCompose('/compose/opportunity')} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Pressable onPress={() => setKind(null)} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
          </Pressable>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: (domain === 'social' ? theme.primary : theme.info) + '22',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
            }}
          >
            <Ionicons
              name={domain === 'social' ? 'sparkles' : 'briefcase'}
              size={14}
              color={domain === 'social' ? theme.primary : theme.info}
            />
            <Text variant="caption" weight="600" style={{ color: domain === 'social' ? theme.primary : theme.info }}>
              {domain === 'social' ? 'Sosyal' : 'Kariyer'}
            </Text>
          </View>
          <Button label="Paylaş" size="sm" fullWidth={false} loading={posting} onPress={submit} />
        </View>

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={domain === 'social' ? 'Neler oluyor? #hashtag kullan' : 'Bir başarı, proje veya fırsat paylaş'}
          placeholderTextColor={theme.textMuted}
          multiline
          autoFocus
          maxLength={500}
          style={{
            flex: 1,
            padding: spacing[3],
            fontSize: 17,
            color: theme.textPrimary,
            textAlignVertical: 'top',
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[4],
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <Ionicons name="image-outline" size={24} color={theme.textSecondary} />
          {domain === 'social' ? (
            <>
              <Pressable onPress={() => goCompose('/compose/poll')} hitSlop={8}>
                <Ionicons name="stats-chart-outline" size={24} color={theme.textSecondary} />
              </Pressable>
              <Pressable onPress={() => goCompose('/compose/event')} hitSlop={8}>
                <Ionicons name="calendar-outline" size={24} color={theme.textSecondary} />
              </Pressable>
            </>
          ) : null}
          <View style={{ flex: 1 }} />
          <Text variant="caption" tone="muted">
            {content.length}/500
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DomainChoice({
  icon,
  title,
  desc,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  color: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: theme.border,
        backgroundColor: theme.surface,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="600" variant="headingMd">
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {desc}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
    </Pressable>
  );
}
