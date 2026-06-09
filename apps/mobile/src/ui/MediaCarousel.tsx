import { useState } from 'react';
import { Pressable, View, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { MediaItem } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface MediaCarouselProps {
  media: MediaItem[];
  width?: number;
  aspectRatio?: number;
  rounded?: boolean;
  onPressItem?: (index: number) => void;
}

function dur(sec?: number): string {
  if (!sec) return '0:15';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Fotoğraf + video taşıyıcı (Instagram tarzı kaydırmalı galeri).
export function MediaCarousel({ media, width, aspectRatio = 1, rounded, onPressItem }: MediaCarouselProps) {
  const { theme, radius } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const w = width ?? screenW;
  const h = w / aspectRatio;
  const [index, setIndex] = useState(0);

  if (!media.length) return null;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    if (i !== index) setIndex(i);
  }

  return (
    <View style={{ width: w, height: h, backgroundColor: theme.surface3, borderRadius: rounded ? radius.lg : 0, overflow: 'hidden' }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={media.length > 1}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {media.map((m, i) => (
          <Pressable key={i} onPress={() => onPressItem?.(i)} style={{ width: w, height: h }}>
            <Image
              source={{ uri: m.poster ?? m.url }}
              style={{ width: w, height: h }}
              contentFit="cover"
              transition={200}
            />
            {m.type === 'video' ? (
              <>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 29,
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="play" size={28} color="#fff" />
                  </View>
                </View>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                  }}
                >
                  <Ionicons name="videocam" size={12} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{dur(m.durationSec)}</Text>
                </View>
              </>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      {/* Çoklu medya sayacı */}
      {media.length > 1 ? (
        <View
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: 'rgba(0,0,0,0.55)',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {index + 1}/{media.length}
          </Text>
        </View>
      ) : null}

      {/* Nokta göstergeleri */}
      {media.length > 1 ? (
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 5,
          }}
        >
          {media.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 7 : 6,
                height: i === index ? 7 : 6,
                borderRadius: 4,
                backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
