import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../lib/theme.js';

// WhatsApp-tarzı "yazıyor..." üç nokta animasyonu.
export function TypingIndicator() {
  const { theme, radius } = useTheme();
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        gap: 4,
        marginHorizontal: 12,
        marginVertical: 4,
        backgroundColor: theme.surface2,
        borderRadius: radius.lg,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: theme.textMuted,
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }}
        />
      ))}
    </View>
  );
}
