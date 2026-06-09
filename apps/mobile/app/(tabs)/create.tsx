import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { Button } from '../../src/ui/Button.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createPost } from '../../src/features/posts/api.js';
import { getMe } from '../../src/features/users/api.js';
import { ApiError } from '../../src/lib/api.js';
import { useQuery } from '@tanstack/react-query';

// Demoda eklenebilecek örnek görseller.
const DEMO_PHOTOS = [
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=70',
];

const QUICK: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string; color: string }[] = [
  { icon: 'stats-chart', label: 'Anket', route: '/compose/poll', color: '#5B4FE8' },
  { icon: 'calendar', label: 'Etkinlik', route: '/compose/event', color: '#3B82F6' },
  { icon: 'rocket', label: 'Proje', route: '/compose/project', color: '#10B981' },
  { icon: 'trophy', label: 'Başarı', route: '/compose/milestone', color: '#F59E0B' },
  { icon: 'megaphone', label: 'Fırsat', route: '/compose/opportunity', color: '#EF4444' },
];

export default function CreateTab() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getMe });
  const me = meQuery.data?.user;

  function addPhoto() {
    if (photos.length >= 4) {
      toast.show('En fazla 4 görsel', 'info');
      return;
    }
    const next = DEMO_PHOTOS[photos.length % DEMO_PHOTOS.length];
    setPhotos((p) => [...p, next]);
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!content.trim() && photos.length === 0) return;
    setPosting(true);
    try {
      await createPost({ content: content.trim(), mediaUrls: photos });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['feed'] }),
        qc.invalidateQueries({ queryKey: ['trending'] }),
        qc.invalidateQueries({ queryKey: ['me'] }),
      ]);
      toast.show('Paylaşıldı 🎉', 'success');
      setContent('');
      setPhotos([]);
      router.replace('/(tabs)');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setPosting(false);
    }
  }

  const canPost = content.trim().length > 0 || photos.length > 0;

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
          <Text variant="headingMd">Yeni Gönderi</Text>
          <Button label="Paylaş" size="sm" fullWidth={false} loading={posting} disabled={!canPost} onPress={submit} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <Avatar uri={me?.avatarUrl} name={me?.displayName} size={44} verified={me?.isVerifiedStudent} />
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Kampüste neler oluyor? #hashtag ekle, fikrini paylaş..."
              placeholderTextColor={theme.textMuted}
              multiline
              autoFocus
              maxLength={500}
              style={{
                flex: 1,
                minHeight: 120,
                fontSize: 17,
                color: theme.textPrimary,
                textAlignVertical: 'top',
                paddingTop: 8,
              }}
            />
          </View>

          {photos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {photos.map((uri, i) => (
                <View key={i}>
                  <Image source={{ uri }} style={{ width: 110, height: 110, borderRadius: radius.md, backgroundColor: theme.surface3 }} />
                  <Pressable
                    onPress={() => removePhoto(i)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: 12,
                    }}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[4],
              paddingVertical: spacing[2],
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Pressable onPress={addPhoto} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="image-outline" size={26} color={theme.success} />
              <Text variant="caption" tone="secondary">Fotoğraf</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/reel/create')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="videocam-outline" size={26} color={theme.danger} />
              <Text variant="caption" tone="secondary">Reel</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/story/create')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="add-circle-outline" size={26} color={theme.primary} />
              <Text variant="caption" tone="secondary">Story</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Text variant="caption" tone="muted">{content.length}/500</Text>
          </View>

          <View style={{ gap: spacing[2] }}>
            <Text variant="caption" tone="muted">Özel içerik türü</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
              {QUICK.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => router.push(item.route as never)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: radius.full,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={item.color} />
                  <Text weight="600" variant="caption">{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
