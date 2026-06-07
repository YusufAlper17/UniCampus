import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { deleteStory, getUserStories, viewStory } from '../../src/features/stories/api.js';

const STORY_DURATION = 5000;
const { width } = Dimensions.get('window');

export default function StoryViewer() {
  const { userId, name, avatar, mine } = useLocalSearchParams<{
    userId: string;
    name?: string;
    avatar?: string;
    mine?: string;
  }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const { data, isLoading } = useQuery({
    queryKey: ['user-stories', userId],
    queryFn: () => getUserStories(userId),
  });
  const stories = data?.items ?? [];
  const current = stories[index];
  const isMine = mine === '1';

  // Görüntülendi olarak işaretle.
  useEffect(() => {
    if (current && !isMine) void viewStory(current.id).catch(() => {});
  }, [current?.id, isMine]);

  // İlerleme animasyonu — bitince sıradakine geç.
  useEffect(() => {
    if (!current) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) advance(1);
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, index]);

  function advance(dir: 1 | -1) {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return 0;
      if (next >= stories.length) {
        void qc.invalidateQueries({ queryKey: ['stories'] });
        router.back();
        return i;
      }
      return next;
    });
  }

  async function onDelete() {
    if (!current) return;
    try {
      await deleteStory(current.id);
      await qc.invalidateQueries({ queryKey: ['stories'] });
      toast.show('Story silindi', 'success');
      router.back();
    } catch {
      toast.show('Silinemedi', 'error');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : !current ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Ionicons name="albums-outline" size={40} color="#fff" />
            <Text style={{ color: '#fff' }}>Aktif story yok</Text>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={{ color: '#fff', opacity: 0.7 }}>Kapat</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* İlerleme çubukları */}
            <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingTop: 6 }}>
              {stories.map((s, i) => (
                <View
                  key={s.id}
                  style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}
                >
                  <Animated.View
                    style={{
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: '#fff',
                      width:
                        i < index
                          ? '100%'
                          : i === index
                            ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                            : '0%',
                    }}
                  />
                </View>
              ))}
            </View>

            {/* Başlık */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Avatar uri={avatar ?? null} name={name ?? 'Story'} size={36} />
              <Text weight="600" style={{ color: '#fff', flex: 1 }}>
                {name ?? 'Story'}
              </Text>
              {isMine ? (
                <Pressable onPress={onDelete} hitSlop={10}>
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                </Pressable>
              ) : null}
              <Pressable onPress={() => router.back()} hitSlop={10}>
                <Ionicons name="close" size={26} color="#fff" />
              </Pressable>
            </View>

            {/* Medya + dokunma bölgeleri */}
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Image
                source={{ uri: current.mediaUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
              <Pressable
                onPress={() => advance(-1)}
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.33 }}
              />
              <Pressable
                onPress={() => advance(1)}
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: width * 0.67 }}
              />
              {current.caption ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 24,
                    left: 16,
                    right: 16,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: '#fff' }}>{current.caption}</Text>
                </View>
              ) : null}
              {isMine && current.viewCount != null ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: current.caption ? 84 : 24,
                    left: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons name="eye-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff' }}>{current.viewCount}</Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
