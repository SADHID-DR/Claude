import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** Progreso 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  color2?: string;
  /** Contenido central (número grande + etiqueta). */
  centerTop?: string;
  centerBottom?: string;
}

/**
 * Anillo de progreso animado estilo Apple Fitness, con degradado.
 * Se rellena suavemente cuando cambia `progress`.
 */
export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 14,
  color = colors.primary,
  color2 = colors.accent,
  centerTop,
  centerBottom,
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor={color2} />
          </LinearGradient>
        </Defs>
        {/* Pista de fondo */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceAlt}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.4}
        />
        {/* Progreso */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {(centerTop || centerBottom) && (
        <View style={{ alignItems: 'center' }}>
          {centerTop ? (
            <Text style={{ color: colors.text, fontSize: size * 0.26, fontWeight: '900' }}>
              {centerTop}
            </Text>
          ) : null}
          {centerBottom ? (
            <Text style={{ color: colors.textMuted, fontSize: size * 0.085, fontWeight: '700' }}>
              {centerBottom}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
