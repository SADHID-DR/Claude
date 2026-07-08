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
  weekMuscleBalance,
  totalVolume,
  computeAchievements,
  WEEKLY_GOAL,
} from '@/lib/stats';
import { planToday } from '@/lib/planToday';
import { ProgressRing } from '@/components/ProgressRing';
import { PressableScale } from '@/components/PressableScale';
import { Card, SectionHeader, StatTile } from '@/components/ui';
import { colors, gradients, muscleColors, radius, spacing, shadow } from '@/lib/theme';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
// Grupos que mostramos siempre en el balance (aunque estén a 0 esta semana).
const BALANCE_MUSCLES = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'];

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routines, sessions, plans, activePlanId } = useStore();

  // Entrenamiento de hoy según el PLAN ACTIVO, el progreso y el calendario.
  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
  // La meta semanal se adapta a los días de tu plan activo.
  const weeklyGoal = activePlan?.days ?? WEEKLY_GOAL;

  const streak = currentStreak(sessions);
  const week = weekWorkoutCount(sessions);
  const weekProgress = week / weeklyGoal;
  const volume = totalVolume(sessions);
  const byDay = useMemo(() => weekVolumeByDay(sessions), [sessions]);
  const maxDay = Math.max(1, ...byDay);
  const achievements = useMemo(() => computeAchievements(sessions), [sessions]);
  const unlocked = achievements.filter((a) => a.unlocked);

  // Balance muscular de la semana: series por grupo (revela músculos olvidados).
  const muscleBalance = useMemo(
    () => weekMuscleBalance(sessions, (id) => getExerciseById(id)?.muscle),
    [sessions]
  );
  const maxMuscleSets = Math.max(1, ...BALANCE_MUSCLES.map((m) => muscleBalance[m] ?? 0));
  const hasBalanceData = BALANCE_MUSCLES.some((m) => (muscleBalance[m] ?? 0) > 0);

  const today = activePlan ? planToday(activePlan, sessions) : null;
  const todayRoutine =
    today?.routineId != null
      ? routines.find((r) => r.id === today.routineId) ?? null
      : null;
  const isRestDay = activePlan != null && today != null && !today.isTrainingDay;

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
          centerTop={`${week}/${weeklyGoal}`}
          centerBottom="esta semana"
        />
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle}>Meta semanal</Text>
          <Text style={styles.heroText}>
            {week >= weeklyGoal
              ? '¡Meta cumplida! Sigue así 💪'
              : `Te faltan ${weeklyGoal - week} entrenamiento${
                  weeklyGoal - week !== 1 ? 's' : ''
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

      {/* Balance muscular semanal */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader title="Balance muscular · semana" />
        <Card>
          {hasBalanceData ? (
            <View style={{ gap: spacing.sm }}>
              {BALANCE_MUSCLES.map((m) => {
                const sets = muscleBalance[m] ?? 0;
                const tint = muscleColors[m] ?? colors.primary;
                return (
                  <View key={m} style={styles.balanceRow}>
                    <Text style={styles.balanceName}>{m}</Text>
                    <View style={styles.balanceTrack}>
                      <View
                        style={[
                          styles.balanceFill,
                          {
                            width: `${Math.max(sets > 0 ? 8 : 0, (sets / maxMuscleSets) * 100)}%`,
                            backgroundColor: sets > 0 ? tint : 'transparent',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.balanceSets, sets === 0 && styles.balanceZero]}>
                      {sets}
                    </Text>
                  </View>
                );
              })}
              <Text style={styles.balanceHint}>
                Series por grupo esta semana. Equilibra los que van por detrás 💡
              </Text>
            </View>
          ) : (
            <Text style={styles.balanceEmpty}>
              Registra un entrenamiento y verás aquí qué músculos trabajas y cuáles te faltan.
            </Text>
          )}
        </Card>
      </View>

      {/* Entrenamiento de hoy */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader title="Entrenamiento de hoy" />
        {todayRoutine ? (
          <PressableScale onPress={() => router.push(`/session/${todayRoutine.id}`)}>
            <View style={[styles.todayCard, shadow]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.todayLabel}>
                  {today?.doneToday ? '✅ HOY (hecho)' : 'HOY'}
                  {activePlan && activePlan.weeks > 1 ? ` · SEMANA ${(today?.weekIndex ?? 0) + 1}` : ''}
                  {today ? ` · ${today.completedInCycle}/${today.cycleTotal}` : ''}
                </Text>
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
        ) : isRestDay ? (
          <Card style={styles.restToday}>
            <Text style={styles.restTodayTitle}>😌 Hoy toca descanso</Text>
            <Text style={styles.restTodayHint}>
              Recupera para crecer. Un poco de movilidad o una caminata suave vienen bien.
            </Text>
          </Card>
        ) : (
          <PressableScale onPress={() => router.push('/routine/generate')}>
            <Card style={styles.emptyToday}>
              <Text style={styles.emptyTodayTitle}>Genera tu plan con el coach</Text>
              <Text style={styles.emptyTodayHint}>
                Elige días, objetivo y edad, y activa un plan para ver aquí qué toca cada día.
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
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  balanceName: { color: colors.text, fontSize: 13, fontWeight: '700', width: 62 },
  balanceTrack: {
    flex: 1,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  balanceFill: { height: '100%', borderRadius: radius.pill, minWidth: 2 },
  balanceSets: { color: colors.textMuted, fontSize: 13, fontWeight: '800', width: 22, textAlign: 'right' },
  balanceZero: { color: colors.surfaceAlt },
  balanceHint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, lineHeight: 17 },
  balanceEmpty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
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
  restToday: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  restTodayTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  restTodayHint: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 19 },
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
