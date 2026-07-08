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
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import { Plan, Routine } from '@/lib/types';
import { scheduleReminders, cancelReminders, sendTestNotification } from '@/lib/notifications';
import { Button, Card, EmptyState, SectionHeader } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

const HOUR_OPTIONS = [6, 7, 8, 12, 17, 18, 19, 20, 21];

export default function RoutinesScreen() {
  const router = useRouter();
  const {
    routines,
    plans,
    activePlanId,
    remindersEnabled,
    reminderHour,
    deleteRoutine,
    deletePlan,
    renamePlan,
    duplicatePlan,
    setActivePlan,
    setRemindersEnabled,
    setReminderHour,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const routinesById = useMemo(() => {
    const map: Record<string, Routine> = {};
    routines.forEach((r) => (map[r.id] = r));
    return map;
  }, [routines]);

  const standalone = routines.filter((r) => !r.planId);
  const isEmpty = plans.length === 0 && standalone.length === 0;

  const confirmDeleteRoutine = (id: string, name: string) => {
    Alert.alert('Eliminar rutina', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRoutine(id) },
    ]);
  };

  const confirmDeletePlan = (plan: Plan) => {
    Alert.alert('Eliminar plan', `¿Eliminar "${plan.name}" y todos sus días?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deletePlan(plan.id) },
    ]);
  };

  const startRename = (plan: Plan) => {
    setEditingId(plan.id);
    setEditName(plan.name);
  };
  const saveRename = () => {
    if (editingId && editName.trim()) renamePlan(editingId, editName.trim());
    setEditingId(null);
  };

  const hhmm = (h: number) => `${String(h).padStart(2, '0')}:00`;

  const toggleReminders = async (plan: Plan) => {
    if (remindersEnabled) {
      await cancelReminders();
      setRemindersEnabled(false);
      return;
    }
    const ok = await scheduleReminders(plan, reminderHour);
    if (ok) {
      setRemindersEnabled(true);
      Alert.alert('Recordatorios activados 🔔', `Te avisaré a las ${hhmm(reminderHour)} tus días de entreno.`);
    } else {
      Alert.alert(
        'No se pudo activar',
        'Concede permiso de notificaciones para recibir recordatorios.'
      );
    }
  };

  const changeHour = async (plan: Plan, h: number) => {
    setReminderHour(h);
    if (remindersEnabled) await scheduleReminders(plan, h);
  };

  const testNotification = async () => {
    const ok = await sendTestNotification();
    Alert.alert(
      ok ? 'Aviso de prueba enviado ⌚' : 'No se pudo enviar',
      ok
        ? 'Llegará en unos segundos. Si tienes un Galaxy Watch emparejado, también lo verás en el reloj.'
        : 'Concede permiso de notificaciones para probarlo.'
    );
  };

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
          hint="Pulsa 'Generar plan' para que tu coach te arme un plan semanal, bisemanal o mensual."
        />
      ) : null}

      {plans.length > 0 ? <SectionHeader title="Planes" /> : null}
      {plans.map((plan) => {
        const active = plan.id === activePlanId;
        const weekNumbers = Array.from({ length: plan.weeks }, (_, i) => i + 1);
        return (
          <Card key={plan.id} style={[styles.planCard, active && styles.planCardActive]}>
            <View style={styles.planTop}>
              {editingId === plan.id ? (
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  onSubmitEditing={saveRename}
                  style={styles.renameInput}
                />
              ) : (
                <Text style={styles.planName}>{plan.name}</Text>
              )}
              {active ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVO</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.planMeta}>
              {plan.cycle} · {plan.days} días/sem · 🗓️ {plan.schedule.join(' · ')} · descanso{' '}
              {plan.restDays}
            </Text>

            {active ? (
              <View style={styles.remindersBox}>
                <Pressable onPress={() => toggleReminders(plan)} style={styles.remindersBtn}>
                  <Text style={styles.remindersText}>
                    {remindersEnabled
                      ? `🔔 Recordatorios ON · ${hhmm(reminderHour)}`
                      : '🔕 Recordatorios OFF'}
                  </Text>
                </Pressable>
                {remindersEnabled ? (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: spacing.xs, paddingVertical: spacing.xs }}
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <Pressable
                          key={h}
                          onPress={() => changeHour(plan, h)}
                          style={[styles.hourChip, reminderHour === h && styles.hourChipActive]}
                        >
                          <Text
                            style={[
                              styles.hourChipText,
                              reminderHour === h && styles.hourChipTextActive,
                            ]}
                          >
                            {hhmm(h)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Pressable onPress={testNotification} style={styles.testBtn}>
                      <Text style={styles.testText}>⌚ Probar aviso (llega al reloj)</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null}

            {weekNumbers.map((wn) => {
              const weekRoutines = plan.routineIds
                .map((rid) => routinesById[rid])
                .filter((r): r is Routine => !!r && (r.week ?? 1) === wn);
              if (weekRoutines.length === 0) return null;
              return (
                <View key={wn} style={styles.weekBlock}>
                  {plan.weeks > 1 ? <Text style={styles.weekTitle}>Semana {wn}</Text> : null}
                  {weekRoutines.map((r) => (
                    <View key={r.id} style={styles.dayRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayName}>{r.name}</Text>
                        <Text style={styles.dayMeta}>{r.exercises.length} ejercicios</Text>
                      </View>
                      <Button title="▶" onPress={() => router.push(`/session/${r.id}`)} />
                    </View>
                  ))}
                </View>
              );
            })}

            <Button
              title="📅 Ver calendario"
              variant="ghost"
              onPress={() => router.push(`/plan/${plan.id}`)}
              style={{ marginTop: spacing.md }}
            />

            <View style={styles.planActions}>
              {editingId === plan.id ? (
                <Button title="Guardar nombre" onPress={saveRename} style={{ flex: 1 }} />
              ) : (
                <>
                  {!active ? (
                    <Button
                      title="✓ Activar"
                      onPress={() => setActivePlan(plan.id)}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                  <Button title="✎" variant="ghost" onPress={() => startRename(plan)} />
                  <Button title="⧉" variant="ghost" onPress={() => duplicatePlan(plan.id)} />
                  <Button title="🗑" variant="danger" onPress={() => confirmDeletePlan(plan)} />
                </>
              )}
            </View>
          </Card>
        );
      })}

      {standalone.length > 0 ? (
        <View style={{ marginTop: plans.length > 0 ? spacing.lg : 0 }}>
          <SectionHeader title="Rutinas sueltas" />
        </View>
      ) : null}
      {standalone.map((item) => (
        <Card key={item.id} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.exercises.length} ejercicio{item.exercises.length !== 1 ? 's' : ''}
          </Text>
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
  planCard: { marginBottom: spacing.md, borderColor: colors.border },
  planCardActive: { borderColor: colors.primary },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planName: { color: colors.text, fontSize: 18, fontWeight: '900', flex: 1 },
  renameInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  activeBadgeText: { color: '#08130c', fontSize: 11, fontWeight: '900' },
  planMeta: { color: colors.accent, fontSize: 12, fontWeight: '600', marginTop: 4 },
  remindersBox: { marginTop: spacing.sm },
  remindersBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  remindersText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  hourChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hourChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  hourChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  hourChipTextActive: { color: '#08130c' },
  testBtn: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  testText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  weekBlock: { marginTop: spacing.sm, gap: spacing.xs },
  weekTitle: {
    color: colors.streak,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
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
  planActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
