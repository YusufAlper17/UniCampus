import { useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';
import { compactNumber } from '../lib/format.js';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
}

// Beğeni butonu — Instagram tarzı spring pop animasyonu + haptic.
export function LikeButton({ liked, count, onToggle }: LikeButtonProps) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    onToggle();
  }

  return (
    <Pressable onPress={handlePress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={24}
          color={liked ? theme.danger : theme.textSecondary}
        />
      </Animated.View>
      {count > 0 ? (
        <Text variant="caption" tone="secondary">
          {compactNumber(count)}
        </Text>
      ) : null}
    </Pressable>
  );
}
