import React, { useRef } from 'react';
import {
  Animated,
  Text,
  View,
  StyleSheet,
  Pressable,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, muscleColors, shadow } from '@/lib/theme';
import { tapMedium } from '@/lib/haptics';

export function Card({
  children,
  style,
  elevated,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
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

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  haptic = true,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
  haptic?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : 'transparent';
  const textColor = variant === 'ghost' ? colors.text : '#08130c';

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
    >
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: bg, transform: [{ scale }] },
          variant === 'ghost' && styles.buttonGhost,
          style,
        ]}
      >
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Ficha compacta con un número grande y una etiqueta (KPI). */
export function StatTile({
  value,
  label,
  emoji,
  tint = colors.primary,
  style,
}: {
  value: string;
  label: string;
  emoji?: string;
  tint?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.statTile, style]}>
      {emoji ? <Text style={styles.statEmoji}>{emoji}</Text> : null}
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
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
}: {
  title: string;
  hint?: string;
  emoji?: string;
}) {
  return (
    <View style={styles.empty}>
      {emoji ? <Text style={styles.emptyEmoji}>{emoji}</Text> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
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
  tagText: { color: '#08130c', fontSize: 12, fontWeight: '800' },
  button: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.border },
  buttonText: { fontWeight: '800', fontSize: 15 },
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
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  sectionAction: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  subtle: { color: colors.textMuted, fontSize: 14 },
  empty: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 44, marginBottom: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
