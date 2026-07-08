import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { scheduleReminders } from '@/lib/notifications';
import { notifySuccess } from '@/lib/haptics';
import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function EditPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { plans, activePlanId, remindersEnabled, reminderHour, updatePlan } = useStore();
  const plan = plans.find((p) => p.id === id);

  const [name, setName] = useState(plan?.name ?? '');
  const [selected, setSelected] = useState<string[]>(plan?.schedule ?? []);

  const needed = plan?.days ?? 0;
  const sortedSelected = useMemo(
    () => WEEKDAYS.filter((d) => selected.includes(d)),
    [selected]
  );

  if (!plan) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Plan no encontrado.</Text>
      </View>
    );
  }

  const toggleDay = (d: string) => {
    setSelected((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= needed) return prev; // no más de los días del plan
      return [...prev, d];
    });
  };

  const save = async () => {
    if (sortedSelected.length !== needed) {
      Alert.alert('Elige los días', `Selecciona exactamente ${needed} días de entrenamiento.`);
      return;
    }
    const updated = {
      ...plan,
      name: name.trim() || plan.name,
      schedule: sortedSelected,
      restDays: 7 - needed,
    };
    updatePlan(updated);
    // Si es el plan activo con recordatorios, reprograma con los nuevos días.
    if (plan.id === activePlanId && remindersEnabled) {
      await scheduleReminders(updated, reminderHour);
    }
    notifySuccess();
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Editar plan' }} />

      <Text style={styles.label}>Nombre</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Días de entrenamiento ({needed})</Text>
      <Text style={styles.hint}>
        Elige en qué días de la semana entrenas. Seleccionados: {sortedSelected.length}/{needed}
      </Text>
      <View style={styles.dayRow}>
        {WEEKDAYS.map((d) => {
          const on = selected.includes(d);
          return (
            <Pressable
              key={d}
              onPress={() => toggleDay(d)}
              style={[styles.dayChip, on && styles.dayChipActive]}
            >
              <Text style={[styles.dayText, on && styles.dayTextActive]}>{d}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.note}>
        Se mantienen tus ejercicios y semanas; solo cambian los días (y el descanso:{' '}
        {7 - needed} día{7 - needed !== 1 ? 's' : ''}/semana).
      </Text>

      <Button title="Guardar cambios" onPress={save} style={{ marginVertical: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayChip: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  dayTextActive: { color: '#08130c' },
  note: { color: colors.textMuted, fontSize: 13, marginTop: spacing.md, lineHeight: 19 },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
