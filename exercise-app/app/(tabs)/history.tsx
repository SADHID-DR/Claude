import { useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import { WorkoutSession } from '@/lib/types';
import {
  currentStreak,
  totalVolume,
  sessionVolume,
  computeAchievements,
} from '@/lib/stats';
import { Button, Card, EmptyState, SectionHeader, StatTile } from '@/components/ui';
import { PressableScale } from '@/components/PressableScale';
import { LineChart, ChartPoint } from '@/components/LineChart';
import { colors, radius, spacing } from '@/lib/theme';

const FEELING_EMOJI: Record<number, string> = {
  1: '😫',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '💪',
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m} min` : `${seconds} s`;
}

export default function ProgressScreen() {
  const { sessions, deleteSession, body, addBodyEntry } = useStore();

  const [weightIn, setWeightIn] = useState('');
  const [waistIn, setWaistIn] = useState('');
  const [armIn, setArmIn] = useState('');

  // Serie de peso corporal en orden cronológico.
  const weightSeries = useMemo<ChartPoint[]>(() => {
    return [...body]
      .sort((a, b) => a.date - b.date)
      .map((e) => {
        const d = new Date(e.date);
        return { value: e.weight, label: `${d.getDate()}/${d.getMonth() + 1}` };
      });
  }, [body]);

  const latestBody = useMemo(
    () => (body.length ? [...body].sort((a, b) => b.date - a.date)[0] : null),
    [body]
  );

  const saveBody = () => {
    const w = parseFloat(weightIn.replace(',', '.'));
    if (isNaN(w) || w <= 0) {
      Alert.alert('Peso no válido', 'Introduce tu peso en kg.');
      return;
    }
    const waist = parseFloat(waistIn.replace(',', '.'));
    const arm = parseFloat(armIn.replace(',', '.'));
    addBodyEntry({
      date: Date.now(),
      weight: w,
      waist: isNaN(waist) ? undefined : waist,
      arm: isNaN(arm) ? undefined : arm,
    });
    setWeightIn('');
    setWaistIn('');
    setArmIn('');
  };

  const streak = currentStreak(sessions);
  const volume = totalVolume(sessions);
  const achievements = useMemo(() => computeAchievements(sessions), [sessions]);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  // Serie de ánimo a lo largo del tiempo (sesiones con ánimo, cronológico).
  const moodSeries = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = [];
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i];
      if (typeof s.feeling === 'number') {
        const d = new Date(s.date);
        points.push({ value: s.feeling, label: `${d.getDate()}/${d.getMonth() + 1}` });
      }
    }
    return points;
  }, [sessions]);

  const confirmDelete = (id: string) => {
    Alert.alert('Eliminar registro', '¿Eliminar este entrenamiento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  };

  const shareProgress = async () => {
    const vol = volume >= 1000 ? `${(volume / 1000).toFixed(1)} t` : `${Math.round(volume)} kg`;
    const lines = [
      '💪 Mi progreso en Ejercicios',
      `🔥 Racha: ${streak} día${streak !== 1 ? 's' : ''}`,
      `🏋️ Entrenamientos: ${sessions.length}`,
      `📊 Volumen total: ${vol}`,
      `🏆 Logros: ${unlocked}/${achievements.length}`,
    ];
    if (sessions.length > 0) {
      lines.push('', 'Últimos entrenos:');
      sessions.slice(0, 3).forEach((s) => {
        lines.push(`• ${s.routineName} — ${Math.round(sessionVolume(s))} kg`);
      });
    }
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // cancelado por el usuario
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* KPIs */}
      <View style={styles.statsRow}>
        <StatTile emoji="🔥" value={String(streak)} label="Racha (días)" tint={colors.streak} />
        <StatTile emoji="🏋️" value={String(sessions.length)} label="Entrenos" tint={colors.accent} />
        <StatTile
          emoji="📊"
          value={volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${Math.round(volume)}`}
          label={volume >= 1000 ? 'Volumen' : 'Volumen kg'}
          tint={colors.primary}
        />
      </View>

      {sessions.length > 0 ? (
        <Button
          title="📤 Compartir mi progreso"
          variant="ghost"
          onPress={shareProgress}
          style={{ marginTop: spacing.md }}
        />
      ) : null}

      {/* Peso corporal y medidas */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader
          title="Peso corporal"
          action={latestBody ? `${latestBody.weight} kg` : undefined}
        />
        <Card>
          {weightSeries.length >= 2 ? (
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <LineChart data={weightSeries} unit=" kg" color={colors.accent} />
            </View>
          ) : (
            <Text style={styles.bodyHint}>
              Registra tu peso (y cintura/brazo si quieres) para ver tu evolución.
            </Text>
          )}
          <View style={styles.bodyInputs}>
            <View style={styles.bodyField}>
              <Text style={styles.bodyLabel}>Peso (kg)</Text>
              <TextInput
                value={weightIn}
                onChangeText={setWeightIn}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={styles.bodyInput}
              />
            </View>
            <View style={styles.bodyField}>
              <Text style={styles.bodyLabel}>Cintura (cm)</Text>
              <TextInput
                value={waistIn}
                onChangeText={setWaistIn}
                keyboardType="decimal-pad"
                placeholder="–"
                placeholderTextColor={colors.textMuted}
                style={styles.bodyInput}
              />
            </View>
            <View style={styles.bodyField}>
              <Text style={styles.bodyLabel}>Brazo (cm)</Text>
              <TextInput
                value={armIn}
                onChangeText={setArmIn}
                keyboardType="decimal-pad"
                placeholder="–"
                placeholderTextColor={colors.textMuted}
                style={styles.bodyInput}
              />
            </View>
          </View>
          <Button title="Registrar peso" onPress={saveBody} style={{ marginTop: spacing.md }} />
        </Card>
      </View>

      {/* Ánimo a lo largo del tiempo */}
      {moodSeries.length >= 2 ? (
        <View style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Ánimo (😫 1 – 5 💪)" />
          <Card style={{ alignItems: 'center' }}>
            <LineChart data={moodSeries} color={colors.warn} />
          </Card>
        </View>
      ) : null}

      {/* Logros */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader
          title="Logros"
          action={`${achievements.filter((a) => a.unlocked).length}/${achievements.length}`}
        />
        <View style={styles.achievements}>
          {achievements.map((a) => (
            <View key={a.id} style={[styles.achCard, !a.unlocked && styles.achLocked]}>
              <Text style={styles.achEmoji}>{a.unlocked ? a.emoji : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.achTitle}>{a.title}</Text>
                <Text style={styles.achDesc}>{a.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Historial */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader title="Historial" />
        {sessions.length === 0 ? (
          <EmptyState
            emoji="📈"
            title="Sin entrenamientos todavía"
            hint="Inicia una rutina y pulsa 'Entrenar' para registrar tu primera sesión."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {sessions.map((item: WorkoutSession) => {
              const exerciseCount = new Set(item.sets.map((s) => s.exerciseId)).size;
              return (
                <PressableScale key={item.id} onLongPress={() => confirmDelete(item.id)} haptic={false}>
                  <Card>
                    <View style={styles.row}>
                      <Text style={styles.name}>
                        {item.feeling ? `${FEELING_EMOJI[item.feeling]} ` : ''}
                        {item.routineName}
                      </Text>
                      <Text style={styles.date}>{fmtDate(item.date)}</Text>
                    </View>
                    <Text style={styles.meta}>
                      {fmtDuration(item.durationSeconds)} · {exerciseCount} ejercicio
                      {exerciseCount !== 1 ? 's' : ''} · {item.sets.length} series ·{' '}
                      {Math.round(sessionVolume(item))} kg
                    </Text>
                    {item.note ? <Text style={styles.noteText}>“{item.note}”</Text> : null}
                    <View style={styles.sets}>
                      {item.sets.slice(0, 5).map((s, i) => {
                        const ex = getExerciseById(s.exerciseId);
                        return (
                          <Text key={i} style={styles.setLine}>
                            • {ex?.name ?? 'Ejercicio'}: {s.weight}kg × {s.reps}
                          </Text>
                        );
                      })}
                      {item.sets.length > 5 ? (
                        <Text style={styles.setLine}>… +{item.sets.length - 5} más</Text>
                      ) : null}
                    </View>
                    <Text style={styles.hintDelete}>Mantén pulsado para eliminar</Text>
                  </Card>
                </PressableScale>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  bodyHint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md, lineHeight: 19 },
  bodyInputs: { flexDirection: 'row', gap: spacing.sm },
  bodyField: { flex: 1 },
  bodyLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  bodyInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 16,
  },
  achievements: { gap: spacing.sm },
  achCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    padding: spacing.md,
  },
  achLocked: { borderColor: colors.border, opacity: 0.55 },
  achEmoji: { fontSize: 30 },
  achTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  achDesc: { color: colors.textMuted, fontSize: 13, marginTop: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  date: { color: colors.textMuted, fontSize: 13, textTransform: 'capitalize' },
  meta: { color: colors.accent, fontSize: 13, marginTop: 2 },
  sets: { marginTop: spacing.sm, gap: 2 },
  setLine: { color: colors.textMuted, fontSize: 13 },
  noteText: {
    color: colors.text,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  hintDelete: { color: colors.surfaceAlt, fontSize: 11, marginTop: spacing.sm },
});
