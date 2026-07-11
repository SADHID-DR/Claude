import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { EXERCISES, getExerciseById } from '@/data/exercises';
import { useStore } from '@/lib/store';
import { weightProgressFor } from '@/lib/stats';
import { lastWeightFor } from '@/lib/coach';
import { allPRs, warmupPlan, ZONES } from '@/lib/strength';
import { fmtWeight, roundLoad, toDisplay, toKg } from '@/lib/units';
import { Card, Tag } from '@/components/ui';
import { PressableScale } from '@/components/PressableScale';
import { ExerciseIcon } from '@/components/ExerciseIcon';
import { ExerciseDemo } from '@/components/ExerciseDemo';
import { FadeInView } from '@/components/FadeInView';
import { LineChart } from '@/components/LineChart';
import { colors, radius, spacing, categoryColors } from '@/lib/theme';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { sessions, unit, strengthGoals, setStrengthGoal } = useStore();
  const exercise = getExerciseById(id);
  // Meta de fuerza (1RM estimado objetivo, en kg internamente).
  const goalKg = strengthGoals[id];
  const [goalIn, setGoalIn] = useState('');
  const saveGoal = () => {
    const g = parseFloat(goalIn.replace(',', '.'));
    setStrengthGoal(id, isNaN(g) || g <= 0 ? null : Math.round(toKg(g, unit) * 10) / 10);
    setGoalIn('');
  };
  const progress = weightProgressFor(sessions, id);
  const pr = allPRs(sessions)[id];
  const lastWeight = lastWeightFor(sessions, id);
  const warmup = lastWeight != null && lastWeight > 0 ? warmupPlan(lastWeight) : null;
  const related = exercise
    ? EXERCISES.filter((e) => e.muscle === exercise.muscle && e.id !== exercise.id).slice(0, 8)
    : [];

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Ejercicio no encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: exercise.name }} />

      <View style={styles.topRow}>
        <ExerciseIcon exercise={exercise} size={72} />
        <View style={styles.headerRow}>
          <Tag label={exercise.muscle} />
          <View style={[styles.pill, { borderColor: categoryColors[exercise.category] }]}>
            <Text style={[styles.pillText, { color: categoryColors[exercise.category] }]}>
              {exercise.category}
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillTextMuted}>{exercise.difficulty}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.equipment}>🏋️ {exercise.equipment}</Text>

      {/* Demostración animada del movimiento */}
      <FadeInView>
        <Card style={styles.demoCard}>
          <Text style={styles.demoHeader}>🎬 Cómo se hace</Text>
          <ExerciseDemo exercise={exercise} size={215} />
          <Text style={styles.demoHint}>Animación orientativa · vista lateral</Text>
        </Card>
      </FadeInView>

      <Text style={styles.description}>{exercise.description}</Text>

      {/* Récords y zonas de trabajo (coach técnico) */}
      {pr ? (
        <Card style={styles.prCard}>
          <View style={styles.prTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prKicker}>🏆 TU RÉCORD</Text>
              <Text style={styles.prValue}>{fmtWeight(pr.e1rm, unit, { round: true })}</Text>
              <Text style={styles.prMeta}>
                1RM estimado · mejor serie: {fmtWeight(pr.weight, unit)} × {pr.reps}
              </Text>
            </View>
          </View>
          <View style={styles.zonesBox}>
            {ZONES.map((z) => {
              const lo = roundLoad(toDisplay(pr.e1rm * z.pctLow, unit), unit);
              const hi = roundLoad(toDisplay(pr.e1rm * z.pctHigh, unit), unit);
              return (
                <View key={z.name} style={styles.zoneRow}>
                  <Text style={styles.zoneName}>{z.name}</Text>
                  <Text style={styles.zoneReps}>{z.reps}</Text>
                  <Text style={styles.zoneKg}>
                    {lo}–{hi} {unit}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {/* Meta de fuerza: 1RM estimado objetivo con % de progreso */}
      <Card style={styles.goalCard}>
        <Text style={styles.goalHeader}>🎯 Meta de fuerza (1RM objetivo)</Text>
        {goalKg ? (
          <>
            <View style={styles.goalRow}>
              <Text style={styles.goalValue}>{fmtWeight(goalKg, unit, { round: true })}</Text>
              {pr ? (
                <Text style={styles.goalPct}>
                  {Math.min(100, Math.round((pr.e1rm / goalKg) * 100))}%
                </Text>
              ) : null}
            </View>
            {pr ? (
              <>
                <View style={styles.goalTrack}>
                  <View
                    style={[
                      styles.goalFill,
                      { width: `${Math.min(100, Math.round((pr.e1rm / goalKg) * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.goalMeta}>
                  {pr.e1rm >= goalKg
                    ? '🏆 ¡Meta conseguida! Ponte una nueva.'
                    : `Tu 1RM estimado: ${fmtWeight(pr.e1rm, unit, { round: true })} · te faltan ${fmtWeight(Math.max(0, goalKg - pr.e1rm), unit, { round: true })}`}
                </Text>
              </>
            ) : (
              <Text style={styles.goalMeta}>
                Registra una sesión con este ejercicio para medir tu progreso.
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.goalMeta}>
            Ponte un objetivo de 1RM y la app te dirá qué % llevas conseguido.
          </Text>
        )}
        <View style={styles.goalInputRow}>
          <TextInput
            value={goalIn}
            onChangeText={setGoalIn}
            onSubmitEditing={saveGoal}
            onBlur={() => (goalIn.trim() !== '' ? saveGoal() : undefined)}
            keyboardType="decimal-pad"
            placeholder={goalKg ? `${Math.round(toDisplay(goalKg, unit))}` : `Objetivo (${unit})`}
            placeholderTextColor={colors.textMuted}
            style={styles.goalInput}
          />
          <Text style={styles.goalUnit}>{unit}</Text>
        </View>
      </Card>

      {/* Calentamiento de aproximación calculado */}
      {warmup ? (
        <Card style={styles.warmupCard}>
          <Text style={styles.warmupHeader}>
            🔥 Calentamiento para {fmtWeight(lastWeight!, unit)}
          </Text>
          <View style={styles.warmupRow}>
            {warmup.map((w, i) => (
              <View key={i} style={styles.warmupSet}>
                <Text style={styles.warmupKg}>{fmtWeight(w.kg, unit, { round: true })}</Text>
                <Text style={styles.warmupReps}>× {w.reps}</Text>
                <Text style={styles.warmupPct}>{Math.round(w.pct * 100)}%</Text>
              </View>
            ))}
            <View style={[styles.warmupSet, styles.warmupWork]}>
              <Text style={[styles.warmupKg, { color: '#08130c' }]}>
                {fmtWeight(lastWeight!, unit)}
              </Text>
              <Text style={[styles.warmupReps, { color: '#08130c' }]}>trabajo</Text>
              <Text style={[styles.warmupPct, { color: '#08130c' }]}>100%</Text>
            </View>
          </View>
        </Card>
      ) : null}

      {/* Progreso: evolución del peso máximo por sesión */}
      {progress.length >= 2 ? (
        <Card style={styles.progressCard}>
          <Text style={styles.progressHeader}>📈 Tu progreso</Text>
          <LineChart
            data={progress.map((p) => ({
              ...p,
              value: Math.round(toDisplay(p.value, unit) * 10) / 10,
            }))}
            unit={` ${unit}`}
          />
        </Card>
      ) : null}

      {/* Coach: cómo elegir el peso / ajustar la máquina */}
      <Card style={styles.coachCard}>
        <Text style={styles.coachHeader}>🎯 Guía de peso / máquina</Text>
        <Text style={styles.coachText}>{exercise.weightGuide}</Text>
      </Card>

      <Text style={styles.sectionTitle}>Instrucciones</Text>
      {exercise.instructions.map((step, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepNumber}>{i + 1}</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}

      {/* Coach: consejos de técnica */}
      <Card style={styles.tipsCard}>
        <Text style={styles.tipsHeader}>💡 Consejos del entrenador</Text>
        {exercise.coachTips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </Card>

      {/* Variantes / otras opciones para el mismo músculo */}
      {related.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>Otras opciones para {exercise.muscle}</Text>
          {related.map((r) => (
            <PressableScale key={r.id} onPress={() => router.push(`/exercise/${r.id}`)}>
              <Card style={styles.relCard}>
                <Text style={styles.relName}>{r.name}</Text>
                <Text style={styles.relEquip}>
                  {r.category} · {r.equipment}
                </Text>
              </Card>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', flex: 1 },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextMuted: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  equipment: { color: colors.textMuted, fontSize: 14 },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  demoCard: { alignItems: 'center', paddingVertical: spacing.sm },
  demoHeader: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  demoHint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  prCard: { borderColor: colors.streak },
  prTop: { flexDirection: 'row', alignItems: 'center' },
  prKicker: { color: colors.streak, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  prValue: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 2 },
  prMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  zonesBox: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 6,
  },
  zoneRow: { flexDirection: 'row', alignItems: 'center' },
  zoneName: { color: colors.text, fontSize: 13, fontWeight: '800', width: 92 },
  zoneReps: { color: colors.textMuted, fontSize: 12, flex: 1 },
  zoneKg: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  goalCard: { borderColor: colors.accent },
  goalHeader: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  goalValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  goalPct: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  goalFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  goalMeta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, lineHeight: 17 },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  goalInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontSize: 16,
  },
  goalUnit: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  warmupCard: { borderColor: colors.primaryDark },
  warmupHeader: { color: colors.primary, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  warmupRow: { flexDirection: 'row', gap: spacing.sm },
  warmupSet: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  warmupWork: { backgroundColor: colors.primary },
  warmupKg: { color: colors.text, fontSize: 15, fontWeight: '900' },
  warmupReps: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 1 },
  warmupPct: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 1 },
  progressCard: { alignItems: 'center' },
  progressHeader: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  coachCard: { backgroundColor: '#14251f', borderColor: colors.primaryDark },
  coachHeader: { color: colors.primary, fontSize: 15, fontWeight: '800', marginBottom: spacing.xs },
  coachText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    color: '#0b1220',
    backgroundColor: colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '800',
  },
  stepText: { color: colors.text, fontSize: 15, flex: 1, lineHeight: 22 },
  tipsCard: { backgroundColor: '#1e2536', borderColor: colors.accent },
  tipsHeader: { color: colors.accent, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  tipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  tipBullet: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  tipText: { color: colors.text, fontSize: 15, flex: 1, lineHeight: 22 },
  relCard: { marginBottom: spacing.sm },
  relName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  relEquip: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
