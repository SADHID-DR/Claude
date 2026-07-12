import { useMemo, useState } from 'react';
import {
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
import {
  Goal,
  Priority,
  Cycle,
  Equipment,
  Duration,
  Level,
  Injury,
  DayType,
  DAY_TYPES,
  LEVELS,
  INJURIES,
  GOALS,
  PRIORITIES,
  DAY_OPTIONS,
  CYCLES,
  EQUIPMENT,
  DURATIONS,
  generatePlan,
} from '@/lib/generator';
import { RoutineExercise as RE } from '@/lib/types';
import { Button, Card } from '@/components/ui';
import { notifySuccess } from '@/lib/haptics';
import { colors, radius, spacing } from '@/lib/theme';

/** Muestra la prescripción (cardio por tiempo, fuerza por series×reps). */
function schemeLabel(re: RE): string {
  const ex = getExerciseById(re.exerciseId);
  if (ex?.muscle === 'Cardio' && re.sets === 1) return `≈${re.reps} min`;
  return `${re.sets}×${re.reps}`;
}

export default function GenerateRoutineScreen() {
  const router = useRouter();
  const { addPlan } = useStore();

  const [days, setDays] = useState(4);
  const [goal, setGoal] = useState<Goal>('Hipertrofia');
  const [age, setAge] = useState('30');
  const [cycle, setCycle] = useState<Cycle>('Semanal');
  const [duration, setDuration] = useState<Duration>(60);
  const [dayTypes, setDayTypes] = useState<DayType[]>(Array.from({ length: 4 }, () => 'Aislado'));
  const [level, setLevel] = useState<Level>('Intermedio');
  const [avoid, setAvoid] = useState<Injury[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [seed, setSeed] = useState(0);

  const ageNum = Math.min(90, Math.max(14, parseInt(age, 10) || 30));

  const plan = useMemo(
    () => generatePlan({ days, goal, age: ageNum, priorities, cycle, equipment, duration, dayTypes, level, avoid }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, goal, ageNum, priorities, cycle, equipment, duration, dayTypes, level, avoid, seed]
  );

  const togglePriority = (p: Priority) => {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const toggleAvoid = (i: Injury) => {
    setAvoid((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const toggleEquipment = (e: Equipment) => {
    setEquipment((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  };

  const totalRoutines = plan.weeks.length * days;

  const save = () => {
    const dayRoutines = plan.weeks.flatMap((wk) =>
      wk.days.map((d) => ({
        name: plan.weeks.length > 1 ? `Sem ${wk.index + 1} · ${d.name}` : d.name,
        exercises: d.exercises,
        week: wk.index + 1,
      }))
    );
    addPlan({
      name: `${plan.title} · ${plan.cycle}`,
      goal: plan.goal,
      days,
      age: ageNum,
      restDays: plan.restDays,
      schedule: plan.schedule,
      warmup: plan.warmup,
      cycle: plan.cycle,
      weeks: plan.weeks.length,
      dayRoutines,
    });
    notifySuccess();
    router.replace('/(tabs)/routines');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Tu coach premium arma un plan (semanal, bisemanal o mensual) según tus días,
        tu edad y tu objetivo, con progresión entre semanas.
      </Text>

      <Text style={styles.label}>Días por semana</Text>
      <View style={styles.optionRow}>
        {DAY_OPTIONS.map((d) => (
          <Pressable
            key={d}
            onPress={() => {
              setDays(d);
              setDayTypes((prev) => Array.from({ length: d }, (_, i) => prev[i] ?? 'Aislado'));
            }}
            style={[styles.dayOption, days === d && styles.optionActive]}
          >
            <Text style={[styles.optionText, days === d && styles.optionTextActive]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Objetivo</Text>
      <View style={styles.optionRow}>
        {GOALS.map((g) => (
          <Pressable
            key={g}
            onPress={() => setGoal(g)}
            style={[styles.option, goal === g && styles.optionActive]}
          >
            <Text style={[styles.optionText, goal === g && styles.optionTextActive]}>{g}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Nivel</Text>
      <View style={styles.optionRow}>
        {LEVELS.map((l) => (
          <Pressable
            key={l}
            onPress={() => setLevel(l)}
            style={[styles.option, level === l && styles.optionActive]}
          >
            <Text style={[styles.optionText, level === l && styles.optionTextActive]}>
              {l}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Ciclo del plan</Text>
      <View style={styles.optionRow}>
        {CYCLES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCycle(c)}
            style={[styles.option, cycle === c && styles.optionActive]}
          >
            <Text style={[styles.optionText, cycle === c && styles.optionTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Duración por sesión</Text>
      <View style={styles.optionRow}>
        {DURATIONS.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDuration(d)}
            style={[styles.option, duration === d && styles.optionActive]}
          >
            <Text style={[styles.optionText, duration === d && styles.optionTextActive]}>
              {d} min
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Tipo de cada día (el coach lo diseña)</Text>
      {Array.from({ length: days }, (_, i) => (
        <View key={i} style={styles.dayTypeRow}>
          <Text style={styles.dayTypeLabel}>Día {i + 1}</Text>
          {DAY_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() =>
                setDayTypes((prev) => prev.map((x, j) => (j === i ? t : x)))
              }
              style={[
                styles.dayTypeChip,
                (dayTypes[i] ?? 'Aislado') === t && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  (dayTypes[i] ?? 'Aislado') === t && styles.optionTextActive,
                ]}
              >
                {t === 'Aislado' ? '🎯 Aislado' : t === 'Completo' ? '🏋️ Completo' : '🔥 CrossFit'}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
      <Text style={styles.dayTypeHint}>
        Aislado = grupos musculares repartidos con eficiencia · Completo = todo el
        cuerpo · CrossFit = WOD de potencia. Mézclalos como quieras.
      </Text>

      <Text style={styles.label}>Edad</Text>
      <TextInput
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
        maxLength={2}
        style={styles.ageInput}
      />

      <Text style={styles.label}>Prioridades (opcional)</Text>
      <View style={styles.optionRow}>
        {PRIORITIES.map((p) => (
          <Pressable
            key={p}
            onPress={() => togglePriority(p)}
            style={[styles.option, priorities.includes(p) && styles.optionActive]}
          >
            <Text
              style={[styles.optionText, priorities.includes(p) && styles.optionTextActive]}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Molestias a evitar (opcional)</Text>
      <View style={styles.optionRow}>
        {INJURIES.map((i) => (
          <Pressable
            key={i}
            onPress={() => toggleAvoid(i)}
            style={[styles.option, avoid.includes(i) && styles.avoidActive]}
          >
            <Text style={[styles.optionText, avoid.includes(i) && styles.avoidTextActive]}>
              {avoid.includes(i) ? '🛡 ' : ''}{i}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Equipo disponible (opcional)</Text>
      <Text style={styles.equipHint}>
        Marca lo que tienes y el coach solo usará esos ejercicios. Sin marcar = usa todo.
      </Text>
      <View style={styles.optionRow}>
        {EQUIPMENT.map((e) => (
          <Pressable
            key={e}
            onPress={() => toggleEquipment(e)}
            style={[styles.option, equipment.includes(e) && styles.optionActive]}
          >
            <Text style={[styles.optionText, equipment.includes(e) && styles.optionTextActive]}>
              {e}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.previewTitle}>{plan.title}</Text>
      <Text style={styles.summary}>{plan.summary}</Text>
      <Button
        title="Regenerar ejercicios"
        icon="refresh"
        variant="ghost"
        onPress={() => setSeed((s) => s + 1)}
        style={{ marginTop: spacing.sm }}
      />
      <View style={styles.ageNote}>
        <Text style={styles.ageNoteText}>👨‍⚕️ {plan.ageNote}</Text>
      </View>

      {/* Recomendación del coach: descanso y calentamiento */}
      <Card style={styles.recCard}>
        <Text style={styles.recHeader}>🗓️ Recomendación del coach</Text>
        <Text style={styles.recLine}>
          <Text style={styles.recBold}>Entrena:</Text> {plan.schedule.join(' · ')}
        </Text>
        <Text style={styles.recLine}>
          <Text style={styles.recBold}>Descanso:</Text> {plan.restDays} día
          {plan.restDays !== 1 ? 's' : ''}/semana (recuperación y crecimiento).
        </Text>
        <Text style={styles.recLine}>
          <Text style={styles.recBold}>Calentamiento:</Text> {plan.warmup}
        </Text>
      </Card>

      {plan.weeks.map((wk) => (
        <View key={`${seed}-${wk.index}`}>
          {plan.weeks.length > 1 ? (
            <View style={styles.weekHeader}>
              <Text style={styles.weekLabel}>{wk.label}</Text>
              <Text style={styles.weekNote}>{wk.note}</Text>
            </View>
          ) : null}
          {wk.days.map((day) => (
            <Card key={`${seed}-${wk.index}-${day.name}`} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.dayName}>{day.name}</Text>
              <Text style={styles.dayFocus}>{day.focus}</Text>
              <View style={styles.exList}>
                {day.exercises.map((re, i) => {
                  const ex = getExerciseById(re.exerciseId);
                  const isCardio = ex?.muscle === 'Cardio';
                  return (
                    <View key={i} style={styles.exRow}>
                      <Text style={styles.exName}>
                        {isCardio ? '🏃 ' : ''}
                        {ex?.name ?? 'Ejercicio'}
                      </Text>
                      <Text style={styles.exScheme}>{schemeLabel(re)}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ))}
        </View>
      ))}

      <Button
        title={`Guardar plan (${totalRoutines} entrenos)`}
        onPress={save}
        style={{ marginVertical: spacing.md }}
      />
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
  equipHint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, marginTop: -spacing.xs, lineHeight: 17 },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayOption: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  dayTypeLabel: { color: colors.text, fontSize: 13, fontWeight: '800', width: 48 },
  dayTypeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dayTypeHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  avoidActive: { backgroundColor: '#3a1d1d', borderColor: colors.danger },
  avoidTextActive: { color: colors.danger },
  optionText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  optionTextActive: { color: '#08130c' },
  ageInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 18,
    fontWeight: '700',
    width: 90,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  previewTitle: { color: colors.text, fontSize: 20, fontWeight: '900', flex: 1 },
  regen: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  summary: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  ageNote: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.sm,
    marginVertical: spacing.md,
  },
  ageNoteText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  recCard: { marginBottom: spacing.md, gap: 4 },
  recHeader: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.xs },
  recLine: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  recBold: { color: colors.text, fontWeight: '700' },
  weekHeader: { marginTop: spacing.sm, marginBottom: spacing.sm },
  weekLabel: { color: colors.text, fontSize: 17, fontWeight: '900' },
  weekNote: { color: colors.streak, fontSize: 13, fontWeight: '600', marginTop: 1 },
  dayName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  dayFocus: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 2, marginBottom: spacing.sm },
  exList: { gap: 2 },
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
