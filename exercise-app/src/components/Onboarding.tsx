import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { Goal, GOALS, DAY_OPTIONS, generatePlan } from '@/lib/generator';
import { Button } from '@/components/ui';
import { FadeInView } from '@/components/FadeInView';
import { notifySuccess } from '@/lib/haptics';
import { colors, radius, spacing } from '@/lib/theme';

const GOAL_INFO: Record<Goal, { emoji: string; desc: string }> = {
  Fuerza: { emoji: '🏋️', desc: 'Levantar más peso, pocas reps.' },
  Hipertrofia: { emoji: '💪', desc: 'Ganar músculo, volumen moderado.' },
  'Pérdida de grasa': { emoji: '🔥', desc: 'Quemar grasa, más reps y cardio.' },
};

/**
 * Bienvenida de primer uso: en dos toques (objetivo + días) el coach crea
 * tu primer plan y te deja listo para entrenar. Reduce la fricción inicial.
 */
export function Onboarding() {
  const insets = useSafeAreaInsets();
  const { addPlan, setOnboarded } = useStore();
  const [goal, setGoal] = useState<Goal>('Hipertrofia');
  const [days, setDays] = useState(4);

  const createPlan = () => {
    const plan = generatePlan({ days, goal, age: 30, priorities: [], cycle: 'Semanal' });
    const dayRoutines = plan.weeks.flatMap((wk) =>
      wk.days.map((d) => ({ name: d.name, exercises: d.exercises, week: wk.index + 1 }))
    );
    addPlan({
      name: `${plan.title} · ${plan.cycle}`,
      goal: plan.goal,
      days,
      age: 30,
      restDays: plan.restDays,
      schedule: plan.schedule,
      warmup: plan.warmup,
      cycle: plan.cycle,
      weeks: plan.weeks.length,
      dayRoutines,
    });
    notifySuccess();
    setOnboarded(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: spacing.xl }}
    >
      <FadeInView>
        <Text style={styles.logo}>💪</Text>
        <Text style={styles.h1}>Bienvenid@ a tu coach</Text>
        <Text style={styles.sub}>
          En dos toques te armo un plan a tu medida. Podrás cambiarlo cuando quieras.
        </Text>
      </FadeInView>

      <FadeInView delay={120}>
        <Text style={styles.label}>1 · ¿Cuál es tu objetivo?</Text>
        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {GOALS.map((g) => {
            const on = goal === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGoal(g)}
                style={[styles.goalCard, on && styles.goalCardOn]}
              >
                <Text style={styles.goalEmoji}>{GOAL_INFO[g].emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalName, on && styles.goalNameOn]}>{g}</Text>
                  <Text style={styles.goalDesc}>{GOAL_INFO[g].desc}</Text>
                </View>
                <View style={[styles.radio, on && styles.radioOn]}>
                  {on ? <Text style={styles.radioDot}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </FadeInView>

      <FadeInView delay={200}>
        <Text style={styles.label}>2 · ¿Cuántos días por semana?</Text>
        <View style={styles.daysRow}>
          {DAY_OPTIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDays(d)}
              style={[styles.dayChip, days === d && styles.dayChipOn]}
            >
              <Text style={[styles.dayNum, days === d && styles.dayNumOn]}>{d}</Text>
            </Pressable>
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={280}>
        <Button title="✨ Crear mi plan y empezar" onPress={createPlan} style={{ marginTop: spacing.xl }} />
        <Pressable onPress={() => setOnboarded(true)} style={styles.skip} hitSlop={8}>
          <Text style={styles.skipText}>Explorar sin plan</Text>
        </Pressable>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  logo: { fontSize: 52, textAlign: 'center' },
  h1: { color: colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm },
  sub: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 21,
  },
  label: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  goalCardOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  goalEmoji: { fontSize: 28 },
  goalName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  goalNameOn: { color: colors.primary },
  goalDesc: { color: colors.textMuted, fontSize: 13, marginTop: 1 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioDot: { color: '#08130c', fontWeight: '900', fontSize: 13 },
  daysRow: { flexDirection: 'row', gap: spacing.sm },
  dayChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  dayNum: { color: colors.text, fontSize: 20, fontWeight: '900' },
  dayNumOn: { color: colors.primary },
  skip: { alignSelf: 'center', marginTop: spacing.md, padding: spacing.sm },
  skipText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
});
