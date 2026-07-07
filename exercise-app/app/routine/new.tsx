import { useMemo, useState } from 'react';
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
import { EXERCISES } from '@/data/exercises';
import { useStore } from '@/lib/store';
import { RoutineExercise } from '@/lib/types';
import { Button, Card, Tag } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export default function NewRoutineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addRoutine, updateRoutine, routines } = useStore();

  // Modo edición: si llega un id, precargamos esa rutina.
  const editing = useMemo(() => routines.find((r) => r.id === id), [routines, id]);

  const [name, setName] = useState(editing?.name ?? '');
  const [selected, setSelected] = useState<Record<string, RoutineExercise>>(() => {
    if (!editing) return {};
    const map: Record<string, RoutineExercise> = {};
    editing.exercises.forEach((re) => {
      map[re.exerciseId] = re;
    });
    return map;
  });

  const toggle = (exerciseId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[exerciseId]) {
        delete next[exerciseId];
      } else {
        next[exerciseId] = { exerciseId, sets: 3, reps: 10, restSeconds: 60 };
      }
      return next;
    });
  };

  const updateField = (
    exerciseId: string,
    field: keyof Omit<RoutineExercise, 'exerciseId'>,
    value: string
  ) => {
    const num = parseInt(value, 10);
    setSelected((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [field]: isNaN(num) ? 0 : num },
    }));
  };

  const save = () => {
    const exercises = Object.values(selected);
    if (name.trim() === '') {
      Alert.alert('Falta el nombre', 'Ponle un nombre a tu rutina.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Sin ejercicios', 'Selecciona al menos un ejercicio.');
      return;
    }
    if (editing) {
      updateRoutine({ ...editing, name: name.trim(), exercises });
    } else {
      addRoutine({ name: name.trim(), exercises });
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: editing ? 'Editar rutina' : 'Nueva rutina' }} />
      <TextInput
        placeholder="Nombre de la rutina (ej. Día de pierna)"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.hint}>Toca para añadir ejercicios y ajusta series/reps:</Text>

      {EXERCISES.map((ex) => {
        const chosen = selected[ex.id];
        return (
          <Card key={ex.id} style={{ marginBottom: spacing.sm }}>
            <Pressable onPress={() => toggle(ex.id)} style={styles.exRow}>
              <View style={styles.checkbox}>
                {chosen ? <Text style={styles.check}>✓</Text> : null}
              </View>
              <Text style={styles.exName}>{ex.name}</Text>
              <Tag label={ex.muscle} />
            </Pressable>

            {chosen ? (
              <View style={styles.fields}>
                <Field
                  label="Series"
                  value={String(chosen.sets)}
                  onChange={(v) => updateField(ex.id, 'sets', v)}
                />
                <Field
                  label="Reps"
                  value={String(chosen.reps)}
                  onChange={(v) => updateField(ex.id, 'reps', v)}
                />
                <Field
                  label="Descanso (s)"
                  value={String(chosen.restSeconds)}
                  onChange={(v) => updateField(ex.id, 'restSeconds', v)}
                />
              </View>
            ) : null}
          </Card>
        );
      })}

      <Button
        title={editing ? 'Guardar cambios' : 'Guardar rutina'}
        onPress={save}
        style={{ marginVertical: spacing.md }}
      />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        style={styles.fieldInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  hint: { color: colors.textMuted, marginBottom: spacing.sm },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: colors.primary, fontWeight: '900' },
  exName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  fields: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  field: { flex: 1 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  fieldInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 16,
  },
});
