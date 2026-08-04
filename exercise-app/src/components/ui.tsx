import React, { useRef } from 'react';
import {
  Animated,
  Text,
  View,
  StyleSheet,
  Pressable,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, muscleColors, shadow, fonts } from '@/lib/theme';
import { tapMedium } from '@/lib/haptics';
import { Icon, IconName } from '@/components/Icon';

export function Card({
  children,
  style,
  elevated,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}) {
  return <View style={[styles.card, elevated && shadow, style]}>{children}</View>;
}

export function Tag({ label }: { label: string }) {
  const bg = muscleColors[label] ?? colors.surfaceAlt;
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

/** Etiqueta accesible por defecto para botones solo-icono (sin texto). */
const ICON_A11Y: Partial<Record<IconName, string>> = {
  pencil: 'Editar',
  play: 'Entrenar',
  trash: 'Eliminar',
  copy: 'Duplicar',
  plus: 'Añadir',
  check: 'Confirmar',
  close: 'Cerrar',
  share: 'Compartir',
  calendar: 'Ver calendario',
  refresh: 'Actualizar',
  clock: 'Temporizador',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  haptic = true,
  icon,
  a11yLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
  haptic?: boolean;
  icon?: IconName;
  /** Etiqueta para lector de pantalla; útil en botones solo-icono. */
  a11yLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : 'transparent';
  const textColor = variant === 'ghost' ? colors.text : colors.onPrimary;
  const label = a11yLabel ?? (title || (icon ? ICON_A11Y[icon] : undefined) || 'Botón');

  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      onPress={() => {
        if (haptic) tapMedium();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: bg, transform: [{ scale }] },
          variant === 'ghost' && styles.buttonGhost,
          style,
        ]}
      >
        {icon ? <Icon name={icon} size={17} color={textColor} strokeWidth={2.2} /> : null}
        {title ? <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

/** Ficha compacta con un número grande y una etiqueta (KPI). */
export function StatTile({
  value,
  label,
  emoji,
  icon,
  tint = colors.primary,
  style,
}: {
  value: string;
  label: string;
  emoji?: string;
  icon?: IconName;
  tint?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.statTile, style]}>
      {icon ? (
        <View style={styles.statIcon}>
          <Icon name={icon} size={20} color={tint} strokeWidth={2.2} />
        </View>
      ) : emoji ? (
        <Text style={styles.statEmoji}>{emoji}</Text>
      ) : null}
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  icon,
  tint = colors.primary,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: IconName;
  tint?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon ? <Icon name={icon} size={19} color={tint} strokeWidth={2.2} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <Pressable
          onPress={onAction}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={action}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Title({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.subtle, style]}>{children}</Text>;
}

export function EmptyState({
  title,
  hint,
  emoji,
  actionLabel,
  onAction,
}: {
  title: string;
  hint?: string;
  emoji?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      {emoji ? (
        <View style={styles.emptyEmojiWrap}>
          <Text style={styles.emptyEmoji}>{emoji}</Text>
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.md, minWidth: 200 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tagText: { color: colors.onPrimary, fontSize: 12, fontFamily: fonts.bodyBold, letterSpacing: 0.3 },
  button: {
    minHeight: 48, // objetivo táctil cómodo
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.border },
  buttonText: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.4 },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  statEmoji: { fontSize: 18, marginBottom: 2 },
  statIcon: { marginBottom: 4, height: 20, justifyContent: 'center' },
  statValue: { fontSize: 28, fontFamily: fonts.displayBold, letterSpacing: 0.3 },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: 'center', fontFamily: fonts.bodyMedium },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { color: colors.text, fontSize: 20, fontFamily: fonts.display, letterSpacing: 0.3 },
  sectionAction: { color: colors.accent, fontSize: 14, fontFamily: fonts.bodySemibold },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.displayBold, letterSpacing: 0.3 },
  subtle: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.body },
  empty: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyEmojiWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { color: colors.text, fontSize: 18, fontFamily: fonts.display, textAlign: 'center' },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
