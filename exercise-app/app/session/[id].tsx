import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import { lastWeightFor, progressionHint } from '@/lib/coach';
import { notifySuccess, tapMedium } from '@/lib/haptics';
import { LoggedSet } from '@/lib/types';
import { Button, Card } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

/** Formatea segundos como mm:ss. */
function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { routines, sessions, addSession } = useStore();
  const routine = routines.find((r) => r.id === id);

  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());

  // Cronómetro de la sesión.
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Estado editable de cada serie: weight/reps por (ejercicio, serie).
  // El peso se pre-rellena con lo que usaste la última vez (coach).
  const initialSets = useMemo<Record<string, { weight: string; reps: string }>>(() => {
    const map: Record<string, { weight: string; reps: string }> = {};
    routine?.exercises.forEach((re) => {
      const last = lastWeightFor(sessions, re.exerciseId);
      const prefill = last != null && last > 0 ? String(last) : '';
      for (let s = 0; s < re.sets; s++) {
        map[`${re.exerciseId}-${s}`] = { weight: prefill, reps: String(re.reps) };
      }
    });
    return map;
  }, [routine, sessions]);

  const [sets, setSets] = useState(initialSets);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const totalSets = routine
    ? routine.exercises.reduce((n, re) => n + re.sets, 0)
    : 0;
  const doneCount = Object.values(done).filter(Boolean).length;

  const toggleDone = (key: string) => {
    tapMedium();
    setDone((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!routine) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Rutina no encontrada.</Text>
      </View>
    );
  }

  const update = (key: string, field: 'weight' | 'reps', value: string) => {
    setSets((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const finish = () => {
    const logged: LoggedSet[] = [];
    routine.exercises.forEach((re) => {
      for (let s = 0; s < re.sets; s++) {
        const entry = sets[`${re.exerciseId}-${s}`];
        const weight = parseFloat(entry?.weight ?? '');
        const reps = parseInt(entry?.reps ?? '', 10);
        if (!isNaN(reps) && reps > 0) {
          logged.push({
            exerciseId: re.exerciseId,
            weight: isNaN(weight) ? 0 : weight,
            reps,
          });
        }
      }
    });

    if (logged.length === 0) {
      Alert.alert('Sin series', 'Registra al menos una serie con repeticiones.');
      return;
    }

    addSession({
      routineId: routine.id,
      routineName: routine.name,
      date: Date.now(),
      durationSeconds: elapsed,
      sets: logged,
    });
    notifySuccess();
    const vol = Math.round(logged.reduce((sum, s) => sum + s.weight * s.reps, 0));
    Alert.alert(
      '¡Entrenamiento guardado! 💪',
      `${logged.length} series · ${vol} kg de volumen total.\n¡Bien hecho!`,
      [
      { text: 'OK', onPress: () => router.replace('/(tabs)/history') },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: routine.name }} />

      <Card style={styles.timerCard}>
        <Text style={styles.timerLabel}>Tiempo de sesión</Text>
        <Text style={styles.timer}>{fmt(elapsed)}</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${totalSets > 0 ? (doneCount / totalSets) * 100 : 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {doneCount}/{totalSets} series completadas
        </Text>
      </Card>

      {routine.exercises.map((re) => {
        const ex = getExerciseById(re.exerciseId);
        return (
          <Card key={re.exerciseId} style={{ marginBottom: spacing.sm }}>
            <Text style={styles.exName}>{ex?.name ?? 'Ejercicio'}</Text>
            <Text style={styles.exMeta}>
              Objetivo: {re.sets}×{re.reps} · descanso {re.restSeconds}s
            </Text>
            <Text style={styles.coachHint}>
              🎯 {progressionHint(lastWeightFor(sessions, re.exerciseId))}
            </Text>

            <View style={styles.headerRow}>
              <Text style={[styles.colHead, styles.colSet]}>Serie</Text>
              <Text style={[styles.colHead, styles.colInput]}>Peso (kg)</Text>
              <Text style={[styles.colHead, styles.colInput]}>Reps</Text>
              <Text style={[styles.colHead, styles.colCheck]}>✓</Text>
            </View>

            {Array.from({ length: re.sets }).map((_, s) => {
              const key = `${re.exerciseId}-${s}`;
              const isDone = !!done[key];
              return (
                <View key={key} style={[styles.setRow, isDone && styles.setRowDone]}>
                  <Text style={[styles.colSet, styles.setIndex]}>{s + 1}</Text>
                  <TextInput
                    value={sets[key]?.weight ?? ''}
                    onChangeText={(v) => update(key, 'weight', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.cellInput, styles.colInput]}
                  />
                  <TextInput
                    value={sets[key]?.reps ?? ''}
                    onChangeText={(v) => update(key, 'reps', v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.cellInput, styles.colInput]}
                  />
                  <Pressable
                    onPress={() => toggleDone(key)}
                    style={[styles.checkBox, isDone && styles.checkBoxDone, styles.colCheck]}
                  >
                    <Text style={[styles.checkMark, isDone && styles.checkMarkDone]}>✓</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        );
      })}

      <Button title="✔ Finalizar y guardar" onPress={finish} style={{ marginVertical: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  timerCard: { alignItems: 'center', marginBottom: spacing.md },
  timerLabel: { color: colors.textMuted, fontSize: 13 },
  timer: { color: colors.primary, fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, fontWeight: '700' },
  exName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  exMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  coachHint: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  colHead: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  colSet: { width: 40, textAlign: 'center' },
  colInput: { flex: 1, textAlign: 'center' },
  colCheck: { width: 40, textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  setRowDone: { backgroundColor: colors.primarySoft },
  setIndex: { color: colors.text, fontWeight: '700' },
  cellInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  checkBox: {
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.surfaceAlt, fontSize: 16, fontWeight: '900' },
  checkMarkDone: { color: '#08130c' },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
