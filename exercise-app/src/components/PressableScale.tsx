import { useRef } from 'react';
import { Animated, Pressable, ViewStyle } from 'react-native';
import { tapLight } from '@/lib/haptics';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  haptic?: boolean;
}

/**
 * Contenedor pulsable que se encoge ligeramente al presionar y dispara una
 * vibración sutil: micro-interacción que hace la app más viva y satisfactoria.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  haptic = true,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      onPressIn={() => {
        to(0.96);
        if (haptic) tapLight();
      }}
      onPressOut={() => to(1)}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
