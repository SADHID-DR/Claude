import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { WODS } from '@/data/wods';
import { getExerciseById } from '@/data/exercises';
import {
  greeting,
  currentStreak,
  weekWorkoutCount,
  weekVolumeByDay,
  totalVolume,
  computeAchievements,
  WEEKLY_GOAL,
} from '@/lib/stats';
import { ProgressRing } from '@/components/ProgressRing';
import { PressableScale } from '@/components/PressableScale';
import { Card, SectionHeader, StatTile } from '@/components/ui';
import { colors, gradients, radius, spacing, shadow } from '@/lib/theme';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routines, sessions } = useStore();

  const streak = currentStreak(sessions);
  const week = weekWorkoutCount(sessions);
  const weekProgress = week / WEEKLY_GOAL;
  const volume = totalVolume(sessions);
  const byDay = useMemo(() => weekVolumeByDay(sessions), [sessions]);
  const maxDay = Math.max(1, ...byDay);
  const achievements = useMemo(() => computeAchievements(sessions), [sessions]);
  const unlocked = achievements.filter((a) => a.unlocked);

  // Entrenamiento del día: rota entre tus rutinas según el día.
  const todayRoutine =
    routines.length > 0 ? routines[new Date().getDate() % routines.length] : null;

  // WOD del día: determinista según el día del año.
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const wodOfDay = WODS[dayOfYear % WODS.length];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cabecera */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()} 👋</Text>
          <Text style={styles.subGreeting}>¿List@ para entrenar?</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>días</Text>
        </View>
      </View>

      {/* Anillo de progreso semanal (héroe) */}
      <Card elevated style={styles.hero}>
        <ProgressRing
          progress={weekProgress}
          size={150}
          centerTop={`${week}/${WEEKLY_GOAL}`}
          centerBottom="esta semana"
        />
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle}>Meta semanal</Text>
          <Text style={styles.heroText}>
            {week >= WEEKLY_GOAL
              ? '¡Meta cumplida! Sigue así 💪'
              : `Te faltan ${WEEKLY_GOAL - week} entrenamiento${
                  WEEKLY_GOAL - week !== 1 ? 's' : ''
                } para tu meta.`}
          </Text>
          {/* Mini-gráfico semanal */}
          <View style={styles.chart}>
            {byDay.map((v, i) => (
              <View key={i} style={styles.chartCol}>
                <View style={styles.chartBarTrack}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: `${Math.max(6, (v / maxDay) * 100)}%`, opacity: v > 0 ? 1 : 0.25 },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{DAY_LABELS[i]}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* KPIs */}
      <View style={styles.statsRow}>
        <StatTile emoji="🔥" value={String(streak)} label="Racha" tint={colors.streak} />
        <StatTile emoji="🏋️" value={String(sessions.length)} label="Entrenos" tint={colors.accent} />
        <StatTile
          emoji="📊"
          value={volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${Math.round(volume)}`}
          label={volume >= 1000 ? 'Volumen' : 'Volumen kg'}
          tint={colors.primary}
        />
      </View>

      {/* Entrenamiento de hoy */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader title="Entrenamiento de hoy" />
        {todayRoutine ? (
          <PressableScale onPress={() => router.push(`/session/${todayRoutine.id}`)}>
            <View style={[styles.todayCard, shadow]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.todayLabel}>RUTINA SUGERIDA</Text>
                <Text style={styles.todayTitle}>{todayRoutine.name}</Text>
                <Text style={styles.todayMeta}>
                  {todayRoutine.exercises.length} ejercicios ·{' '}
                  {todayRoutine.exercises
                    .slice(0, 2)
                    .map((re) => getExerciseById(re.exerciseId)?.name)
                    .filter(Boolean)
                    .join(', ')}
                  {todayRoutine.exercises.length > 2 ? '…' : ''}
                </Text>
              </View>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          </PressableScale>
        ) : (
          <PressableScale onPress={() => router.push('/routine/new')}>
            <Card style={styles.emptyToday}>
              <Text style={styles.emptyTodayTitle}>Crea tu primera rutina</Text>
              <Text style={styles.emptyTodayHint}>
                Combina ejercicios del catálogo y empieza a entrenar con tu coach.
              </Text>
            </Card>
          </PressableScale>
        )}
      </View>

      {/* WOD del día */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader title="WOD del día 🔥" action="Ver todos" onAction={() => router.push('/(tabs)/wods')} />
        <PressableScale onPress={() => router.push(`/wod/${wodOfDay.id}`)}>
          <View style={[styles.wodCard, shadow]}>
            <Text style={styles.wodName}>{wodOfDay.name}</Text>
            <Text style={styles.wodFormat}>
              {wodOfDay.format}
              {wodOfDay.minutes ? ` · ${wodOfDay.minutes} min` : ''}
            </Text>
            <Text style={styles.wodDesc} numberOfLines={2}>
              {wodOfDay.description}
            </Text>
          </View>
        </PressableScale>
      </View>

      {/* Accesos rápidos */}
      <View style={styles.quickRow}>
        <QuickAction emoji="⏱️" label="Temporizador" onPress={() => router.push('/timer')} />
        <QuickAction emoji="💪" label="Ejercicios" onPress={() => router.push('/(tabs)/exercises')} />
        <QuickAction emoji="📋" label="Rutinas" onPress={() => router.push('/(tabs)/routines')} />
      </View>

      {/* Logros */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader
          title="Logros"
          action={`${unlocked.length}/${achievements.length}`}
          onAction={() => router.push('/(tabs)/history')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {achievements.map((a) => (
            <View key={a.id} style={[styles.badge, !a.unlocked && styles.badgeLocked]}>
              <Text style={[styles.badgeEmoji, !a.unlocked && styles.badgeEmojiLocked]}>
                {a.unlocked ? a.emoji : '🔒'}
              </Text>
              <Text style={styles.badgeTitle} numberOfLines={1}>
                {a.title}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

function QuickAction({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} style={styles.quickAction}>
      <Text style={styles.quickEmoji}>{emoji}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  greeting: { color: colors.text, fontSize: 26, fontWeight: '900' },
  subGreeting: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
  streakBadge: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.streak,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 64,
  },
  streakFlame: { fontSize: 18 },
  streakNum: { color: colors.streak, fontSize: 20, fontWeight: '900', marginTop: -2 },
  streakLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroInfo: { flex: 1 },
  heroTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  heroText: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  chart: {
    flexDirection: 'row',
    gap: 5,
    marginTop: spacing.md,
    height: 52,
    alignItems: 'flex-end',
  },
  chartCol: { flex: 1, alignItems: 'center', gap: 3 },
  chartBarTrack: { width: '100%', height: 38, justifyContent: 'flex-end' },
  chartBar: { width: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  chartLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    padding: spacing.md,
    gap: spacing.md,
  },
  todayLabel: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  todayTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
  todayMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#08130c', fontSize: 18, fontWeight: '900', marginLeft: 3 },
  emptyToday: { borderStyle: 'dashed' },
  emptyTodayTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  emptyTodayHint: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 19 },
  wodCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
  },
  wodName: { color: colors.text, fontSize: 19, fontWeight: '900' },
  wodFormat: { color: colors.accent, fontSize: 13, fontWeight: '800', marginTop: 2 },
  wodDesc: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, lineHeight: 19 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  quickEmoji: { fontSize: 24 },
  quickLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  badge: {
    width: 92,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  badgeLocked: { borderColor: colors.border, opacity: 0.6 },
  badgeEmoji: { fontSize: 28 },
  badgeEmojiLocked: { fontSize: 24 },
  badgeTitle: { color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
