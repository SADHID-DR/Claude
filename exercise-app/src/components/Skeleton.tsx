import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * Bloque "shimmer" para estados de carga: un rectángulo que late suavemente
 * en opacidad. Reserva el espacio del contenido real para evitar saltos de
 * layout cuando llegan los datos.
 */
export function Skeleton({
  width,
  height = 16,
  radius: r = radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: r,
          backgroundColor: colors.surfaceAlt,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Fila de 3 tarjetas KPI en carga (misma altura que StatTile real). */
export function StatRowSkeleton() {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.md,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Skeleton width={22} height={22} radius={11} />
          <Skeleton width={40} height={22} />
          <Skeleton width={52} height={10} />
        </View>
      ))}
    </View>
  );
}

/** Tarjeta grande en carga (radar, gráficos, secciones). */
export function CardSkeleton({ height = 180 }: { height?: number }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Skeleton width="55%" height={16} />
      <Skeleton width="100%" height={height} radius={radius.md} />
    </View>
  );
}
