import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
    Alert.alert('¡Entrenamiento guardado!', 'Se añadió a tu registro.', [
      { text: 'OK', onPress: () => router.replace('/(tabs)/history') },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: routine.name }} />

      <Card style={styles.timerCard}>
        <Text style={styles.timerLabel}>Tiempo de sesión</Text>
        <Text style={styles.timer}>{fmt(elapsed)}</Text>
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
            </View>

            {Array.from({ length: re.sets }).map((_, s) => {
              const key = `${re.exerciseId}-${s}`;
              return (
                <View key={key} style={styles.setRow}>
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
  colSet: { width: 44, textAlign: 'center' },
  colInput: { flex: 1, textAlign: 'center' },
  setRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.xs },
  setIndex: { color: colors.text, fontWeight: '700' },
  cellInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
