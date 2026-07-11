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
import { MuscleGroup, RoutineExercise } from '@/lib/types';
import { Button, Card, Tag } from '@/components/ui';
import { ExerciseDemo } from '@/components/ExerciseDemo';
import { colors, radius, spacing } from '@/lib/theme';

const MUSCLES: (MuscleGroup | 'Todos')[] = [
  'Todos',
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Core',
  'Cuerpo completo',
  'Cardio',
];

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
  // Orden de los ejercicios en la rutina (editable a discreción).
  const [order, setOrder] = useState<string[]>(() =>
    editing ? editing.exercises.map((re) => re.exerciseId) : []
  );

  const moveExercise = (exId: string, dir: -1 | 1) => {
    setOrder((prev) => {
      const i = prev.indexOf(exId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'Todos'>('Todos');
  // Demostración de técnica abierta (👁) por ejercicio.
  const [demoId, setDemoId] = useState<string | null>(null);
  const selectedCount = Object.keys(selected).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      const matchMuscle = muscle === 'Todos' || e.muscle === muscle;
      const matchQuery =
        q === '' ||
        e.name.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q);
      return matchMuscle && matchQuery;
    });
  }, [query, muscle]);

  const toggle = (exerciseId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[exerciseId]) {
        delete next[exerciseId];
        setOrder((ord) => ord.filter((x) => x !== exerciseId));
      } else {
        next[exerciseId] = { exerciseId, sets: 3, reps: 10, restSeconds: 60 };
        setOrder((ord) => [...ord, exerciseId]);
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
    const exercises = order.map((exId) => selected[exId]).filter(Boolean);
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

      <TextInput
        placeholder="Buscar ejercicio o equipo (barra, mancuerna, kettlebell…)"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}
      >
        {MUSCLES.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMuscle(m)}
            style={[styles.chip, muscle === m && styles.chipActive]}
          >
            <Text style={[styles.chipText, muscle === m && styles.chipTextActive]}>{m}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.hint}>
        {selectedCount > 0
          ? `${selectedCount} seleccionado${selectedCount !== 1 ? 's' : ''} · toca para añadir/quitar`
          : 'Toca un ejercicio para añadirlo y ajusta series/reps.'}
      </Text>

      {selectedCount > 1 ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.orderTitle}>↕ Orden de la rutina</Text>
          {order.map((exId, i) => {
            const info = EXERCISES.find((e) => e.id === exId);
            return (
              <View key={exId} style={styles.orderRow}>
                <Text style={styles.orderIndex}>{i + 1}</Text>
                <Text style={styles.orderName}>{info?.name ?? exId}</Text>
                <Pressable
                  onPress={() => moveExercise(exId, -1)}
                  disabled={i === 0}
                  style={[styles.orderBtn, i === 0 && styles.orderBtnOff]}
                  hitSlop={6}
                >
                  <Text style={styles.orderBtnText}>▲</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveExercise(exId, 1)}
                  disabled={i === order.length - 1}
                  style={[styles.orderBtn, i === order.length - 1 && styles.orderBtnOff]}
                  hitSlop={6}
                >
                  <Text style={styles.orderBtnText}>▼</Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : null}

      {filtered.map((ex) => {
        const chosen = selected[ex.id];
        return (
          <Card
            key={ex.id}
            style={{
              marginBottom: spacing.sm,
              borderColor: chosen ? colors.primary : colors.border,
            }}
          >
            <Pressable onPress={() => toggle(ex.id)} style={styles.exRow}>
              <View style={[styles.checkbox, chosen && styles.checkboxOn]}>
                {chosen ? <Text style={styles.check}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{ex.name}</Text>
                <Text style={styles.exEquip}>{ex.equipment}</Text>
              </View>
              <Pressable
                onPress={() => setDemoId((d) => (d === ex.id ? null : ex.id))}
                hitSlop={8}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{demoId === ex.id ? '✕' : '👁'}</Text>
              </Pressable>
              <Tag label={ex.muscle} />
            </Pressable>

            {demoId === ex.id ? (
              <View style={styles.demoWrap}>
                <ExerciseDemo exercise={ex} size={150} />
              </View>
            ) : null}

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

      {filtered.length === 0 ? (
        <Text style={styles.empty}>No hay ejercicios que coincidan.</Text>
      ) : null}

      <Button
        title={
          editing
            ? `Guardar cambios (${selectedCount})`
            : `Guardar rutina (${selectedCount})`
        }
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
  search: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    fontSize: 15,
  },
  chips: { flexGrow: 0, minHeight: 46, marginBottom: spacing.sm },
  chipsContent: { gap: spacing.sm, alignItems: 'center', paddingVertical: 3 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13, lineHeight: 18 },
  chipTextActive: { color: '#08130c' },
  hint: { color: colors.textMuted, marginBottom: spacing.sm },
  orderTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  orderIndex: {
    color: '#08130c',
    backgroundColor: colors.accent,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '900',
  },
  orderName: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  orderBtn: {
    width: 34,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnOff: { opacity: 0.3 },
  orderBtnText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary },
  check: { color: '#08130c', fontWeight: '900' },
  exName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  exEquip: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  eyeBtn: {
    width: 34,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeText: { fontSize: 15 },
  demoWrap: { alignItems: 'center', marginTop: spacing.sm },
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
