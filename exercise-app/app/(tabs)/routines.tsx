import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { Plan, Routine } from '@/lib/types';
import { scheduleReminders, cancelReminders, sendTestNotification } from '@/lib/notifications';
import { Button, Card, EmptyState, SectionHeader } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export default function RoutinesScreen() {
  const router = useRouter();
  const {
    routines,
    plans,
    activePlanId,
    remindersEnabled,
    reminderHour,
    reminderMinute,
    deleteRoutine,
    deletePlan,
    duplicatePlan,
    movePlanDay,
    setActivePlan,
    setRemindersEnabled,
    setReminderHour,
    setReminderMinute,
  } = useStore();

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

  const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const [timeIn, setTimeIn] = useState('');

  const saveTime = async (plan: Plan) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(timeIn.trim());
    const h = m ? parseInt(m[1], 10) : NaN;
    const mi = m ? parseInt(m[2], 10) : NaN;
    if (!m || h > 23 || mi > 59) {
      Alert.alert('Hora no válida', 'Escríbela en formato 24 h, por ejemplo 19:30.');
      return;
    }
    setReminderHour(h);
    setReminderMinute(mi);
    if (remindersEnabled) await scheduleReminders(plan, h, mi);
    Alert.alert('Hora guardada ⏰', `Te avisaré a las ${hhmm(h, mi)} tus días de entreno.`);
  };

  const toggleReminders = async (plan: Plan) => {
    if (remindersEnabled) {
      await cancelReminders();
      setRemindersEnabled(false);
      return;
    }
    const ok = await scheduleReminders(plan, reminderHour, reminderMinute);
    if (ok) {
      setRemindersEnabled(true);
      Alert.alert('Recordatorios activados 🔔', `Te avisaré a las ${hhmm(reminderHour, reminderMinute)} tus días de entreno.`);
    } else {
      Alert.alert(
        'No se pudo activar',
        'Concede permiso de notificaciones para recibir recordatorios.'
      );
    }
  };

  const testNotification = async () => {
    const ok = await sendTestNotification();
    Alert.alert(
      ok ? 'Aviso de prueba enviado ⌚' : 'No se pudo enviar',
      ok
        ? 'Llegará en 10 segundos: BLOQUEA el teléfono ya para que el aviso salte en el reloj (el reloj solo muestra avisos con el teléfono bloqueado).'
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
          title="Generar plan"
          icon="sparkle"
          onPress={() => router.push('/routine/generate')}
          style={{ flex: 1 }}
        />
        <Button
          title="Nueva"
          icon="plus"
          variant="ghost"
          onPress={() => router.push('/routine/new')}
          style={{ flex: 1 }}
        />
      </View>

      {isEmpty ? (
        <EmptyState
          emoji="📋"
          title="Aún no tienes rutinas"
          hint="Deja que tu coach te arme un plan semanal, bisemanal o mensual a tu medida."
          actionLabel="✨ Generar plan"
          onAction={() => router.push('/routine/generate')}
        />
      ) : null}

      {plans.length > 0 ? <SectionHeader title="Planes" /> : null}
      {plans.map((plan) => {
        const active = plan.id === activePlanId;
        const weekNumbers = Array.from({ length: plan.weeks }, (_, i) => i + 1);
        return (
          <Card key={plan.id} style={[styles.planCard, active && styles.planCardActive]}>
            <View style={styles.planTop}>
              <Text style={styles.planName}>{plan.name}</Text>
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
                      ? `🔔 Recordatorios ON · ${hhmm(reminderHour, reminderMinute)}`
                      : '🔕 Recordatorios OFF'}
                  </Text>
                </Pressable>
                {remindersEnabled ? (
                  <>
                    <View style={styles.timeRow}>
                      <TextInput
                        value={timeIn}
                        onChangeText={setTimeIn}
                        placeholder={hhmm(reminderHour, reminderMinute)}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        style={styles.timeInput}
                      />
                      <Button title="Guardar hora" onPress={() => saveTime(plan)} />
                    </View>
                    <Text style={styles.watchHint}>
                      ⌚ ¿No llega al reloj? En tu teléfono abre Galaxy Wearable →
                      Ajustes del reloj → Notificaciones → Notificaciones de aplicaciones
                      y activa "Ejercicios" (aparece tras enviar el aviso de prueba).
                      Para que SUENE y VIBRE en el reloj: en esa misma pantalla elige
                      "Sonido y vibración" como estilo de alerta y comprueba que el
                      reloj no esté en silencio ni en No molestar.
                      Ojo: el reloj solo muestra avisos si el teléfono está bloqueado.
                    </Text>
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
                  {weekRoutines.map((r, di) => (
                    <View key={r.id} style={styles.dayRow}>
                      <View style={styles.reorderCol}>
                        <Pressable
                          onPress={() => movePlanDay(plan.id, r.id, -1)}
                          disabled={di === 0}
                          style={[styles.reorderBtn, di === 0 && styles.reorderOff]}
                          hitSlop={6}
                        >
                          <Text style={styles.reorderText}>▲</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => movePlanDay(plan.id, r.id, 1)}
                          disabled={di === weekRoutines.length - 1}
                          style={[
                            styles.reorderBtn,
                            di === weekRoutines.length - 1 && styles.reorderOff,
                          ]}
                          hitSlop={6}
                        >
                          <Text style={styles.reorderText}>▼</Text>
                        </Pressable>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayName}>{r.name}</Text>
                        <Text style={styles.dayMeta}>{r.exercises.length} ejercicios</Text>
                      </View>
                      <Button
                        title=""
                        icon="pencil"
                        variant="ghost"
                        onPress={() => router.push(`/routine/new?id=${r.id}`)}
                      />
                      <Button title="" icon="play" onPress={() => router.push(`/session/${r.id}`)} />
                    </View>
                  ))}
                </View>
              );
            })}

            <Button
              title="Ver calendario"
              icon="calendar"
              variant="ghost"
              onPress={() => router.push(`/plan/${plan.id}`)}
              style={{ marginTop: spacing.md }}
            />

            <View style={styles.planActions}>
              {!active ? (
                <Button
                  title="Activar"
                  icon="check"
                  onPress={() => setActivePlan(plan.id)}
                  style={{ flex: 1 }}
                />
              ) : null}
              <Button
                title=""
                icon="pencil"
                variant="ghost"
                onPress={() => router.push(`/plan/edit/${plan.id}`)}
              />
              <Button title="" icon="copy" variant="ghost" onPress={() => duplicatePlan(plan.id)} />
              <Button title="" icon="trash" variant="danger" onPress={() => confirmDeletePlan(plan)} />
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
              title="Entrenar"
              icon="play"
              onPress={() => router.push(`/session/${item.id}`)}
              style={{ flex: 1 }}
            />
            <Button
              title="Editar"
              icon="pencil"
              variant="ghost"
              onPress={() => router.push(`/routine/new?id=${item.id}`)}
            />
            <Button
              title=""
              icon="trash"
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timeInput: {
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    fontWeight: '700',
    width: 110,
    textAlign: 'center',
  },
  watchHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
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
  reorderCol: { justifyContent: 'center', gap: 2 },
  reorderBtn: {
    width: 26,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderOff: { opacity: 0.3 },
  reorderText: { color: colors.text, fontSize: 12, fontWeight: '900', lineHeight: 14 },
  dayName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dayMeta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  planActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
