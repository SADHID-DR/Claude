import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';

const COLORS = [colors.primary, colors.accent, colors.streak, colors.warn, '#a78bfa', '#f472b6'];

/**
 * Lluvia de confeti breve para celebrar (fin de entreno, récord). Se dibuja
 * sobre todo lo demás y se desvanece sola; `run` la dispara.
 */
export function Confetti({ run, pieces = 26 }: { run: boolean; pieces?: number }) {
  const { width, height } = Dimensions.get('window');
  const items = useRef(
    Array.from({ length: pieces }, (_, i) => ({
      key: i,
      x: Math.random() * width,
      size: 6 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 250,
      drift: (Math.random() - 0.5) * 80,
      rotateTo: (Math.random() - 0.5) * 8,
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!run) return;
    const anims = items.map((it) =>
      Animated.timing(it.anim, {
        toValue: 1,
        duration: 1400 + Math.random() * 600,
        delay: it.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    items.forEach((it) => it.anim.setValue(0));
    Animated.stagger(8, anims).start();
  }, [run, items]);

  if (!run) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((it) => {
        const translateY = it.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, height + 30],
        });
        const translateX = it.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [it.x, it.x + it.drift],
        });
        const rotate = it.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${it.rotateTo * 90}deg`],
        });
        const opacity = it.anim.interpolate({
          inputRange: [0, 0.85, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={it.key}
            style={{
              position: 'absolute',
              width: it.size,
              height: it.size * 0.6,
              borderRadius: 2,
              backgroundColor: it.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
