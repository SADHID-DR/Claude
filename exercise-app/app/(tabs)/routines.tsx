import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import { Plan, Routine } from '@/lib/types';
import { Button, Card, EmptyState, SectionHeader } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export default function RoutinesScreen() {
  const router = useRouter();
  const { routines, plans, deleteRoutine, deletePlan } = useStore();

  const routinesById = useMemo(() => {
    const map: Record<string, Routine> = {};
    routines.forEach((r) => (map[r.id] = r));
    return map;
  }, [routines]);

  // Rutinas sueltas: las que no pertenecen a ningún plan.
  const standalone = routines.filter((r) => !r.planId);

  const confirmDeleteRoutine = (id: string, name: string) => {
    Alert.alert('Eliminar rutina', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRoutine(id) },
    ]);
  };

  const confirmDeletePlan = (plan: Plan) => {
    Alert.alert('Eliminar plan', `¿Eliminar "${plan.name}" y sus ${plan.days} días?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deletePlan(plan.id) },
    ]);
  };

  const isEmpty = plans.length === 0 && standalone.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
    >
      <View style={styles.header}>
        <Button
          title="✨ Generar plan"
          onPress={() => router.push('/routine/generate')}
          style={{ flex: 1 }}
        />
        <Button
          title="＋ Nueva"
          variant="ghost"
          onPress={() => router.push('/routine/new')}
          style={{ flex: 1 }}
        />
      </View>

      {isEmpty ? (
        <EmptyState
          emoji="📋"
          title="Aún no tienes rutinas"
          hint="Pulsa 'Generar plan' para que tu coach te arme un plan semanal completo."
        />
      ) : null}

      {/* Planes semanales (bloques) */}
      {plans.length > 0 ? <SectionHeader title="Planes semanales" /> : null}
      {plans.map((plan) => (
        <Card key={plan.id} style={styles.planCard}>
          <View style={styles.planTop}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{plan.days} días</Text>
            </View>
          </View>
          <Text style={styles.planMeta}>
            🗓️ {plan.schedule.join(' · ')} · descanso {plan.restDays} día
            {plan.restDays !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.planWarmup}>🔥 {plan.warmup}</Text>

          <View style={styles.dayList}>
            {plan.routineIds.map((rid) => {
              const r = routinesById[rid];
              if (!r) return null;
              return (
                <View key={rid} style={styles.dayRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayName}>{r.name}</Text>
                    <Text style={styles.dayMeta}>{r.exercises.length} ejercicios</Text>
                  </View>
                  <Button title="▶" onPress={() => router.push(`/session/${r.id}`)} />
                </View>
              );
            })}
          </View>

          <Button
            title="🗑 Eliminar plan"
            variant="danger"
            onPress={() => confirmDeletePlan(plan)}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      ))}

      {/* Rutinas sueltas */}
      {standalone.length > 0 ? (
        <View style={{ marginTop: plans.length > 0 ? spacing.lg : 0 }}>
          <SectionHeader title="Rutinas" />
        </View>
      ) : null}
      {standalone.map((item) => (
        <Card key={item.id} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.exercises.length} ejercicio{item.exercises.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.exerciseList}>
            {item.exercises.map((re, i) => {
              const ex = getExerciseById(re.exerciseId);
              return (
                <Text key={i} style={styles.exerciseLine}>
                  • {ex?.name ?? 'Ejercicio'} — {re.sets}×{re.reps}
                </Text>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Button
              title="▶ Entrenar"
              onPress={() => router.push(`/session/${item.id}`)}
              style={{ flex: 1 }}
            />
            <Button
              title="✎ Editar"
              variant="ghost"
              onPress={() => router.push(`/routine/new?id=${item.id}`)}
            />
            <Button
              title="🗑"
              variant="danger"
              onPress={() => confirmDeleteRoutine(item.id, item.name)}
            />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  planCard: { marginBottom: spacing.md, borderColor: colors.primaryDark },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planName: { color: colors.text, fontSize: 18, fontWeight: '900', flex: 1 },
  planBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  planBadgeText: { color: '#08130c', fontSize: 12, fontWeight: '800' },
  planMeta: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: 4 },
  planWarmup: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  dayList: { marginTop: spacing.sm, gap: spacing.xs },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  dayName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dayMeta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  exerciseList: { marginTop: spacing.sm, gap: 2 },
  exerciseLine: { color: colors.textMuted, fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
