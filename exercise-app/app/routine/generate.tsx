import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import {
  Goal,
  Focus,
  GOALS,
  FOCUSES,
  generateRoutine,
} from '@/lib/generator';
import { Button, Card } from '@/components/ui';
import { notifySuccess } from '@/lib/haptics';
import { colors, radius, spacing } from '@/lib/theme';

export default function GenerateRoutineScreen() {
  const router = useRouter();
  const { addRoutine } = useStore();

  const [goal, setGoal] = useState<Goal>('Hipertrofia');
  const [focus, setFocus] = useState<Focus>('Cuerpo completo');
  const [seed, setSeed] = useState(0); // para regenerar

  const generated = useMemo(
    () => generateRoutine(goal, focus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goal, focus, seed]
  );

  const save = () => {
    addRoutine({ name: generated.name, exercises: generated.exercises });
    notifySuccess();
    router.replace('/(tabs)/routines');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Tu coach arma una rutina según tu objetivo. Ajusta y guárdala.
      </Text>

      <Text style={styles.label}>Objetivo</Text>
      <View style={styles.optionRow}>
        {GOALS.map((g) => (
          <Pressable
            key={g}
            onPress={() => setGoal(g)}
            style={[styles.option, goal === g && styles.optionActive]}
          >
            <Text style={[styles.optionText, goal === g && styles.optionTextActive]}>
              {g}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Enfoque</Text>
      <View style={styles.optionRow}>
        {FOCUSES.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFocus(f)}
            style={[styles.option, focus === f && styles.optionActive]}
          >
            <Text style={[styles.optionText, focus === f && styles.optionTextActive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Vista previa</Text>
        <Pressable onPress={() => setSeed((s) => s + 1)} hitSlop={8}>
          <Text style={styles.regen}>🔄 Regenerar</Text>
        </Pressable>
      </View>

      <Card>
        <Text style={styles.routineName}>{generated.name}</Text>
        <Text style={styles.routineDesc}>{generated.description}</Text>
        <View style={styles.exList}>
          {generated.exercises.map((re, i) => {
            const ex = getExerciseById(re.exerciseId);
            return (
              <View key={i} style={styles.exRow}>
                <Text style={styles.exName}>{ex?.name ?? 'Ejercicio'}</Text>
                <Text style={styles.exScheme}>
                  {re.sets}×{re.reps} · {re.restSeconds}s
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Button title="Guardar rutina" onPress={save} style={{ marginVertical: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  intro: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.md, lineHeight: 20 },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  optionTextActive: { color: '#08130c' },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  previewTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  regen: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  routineName: { color: colors.text, fontSize: 18, fontWeight: '900' },
  routineDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm },
  exList: { gap: spacing.xs },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  exScheme: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});
