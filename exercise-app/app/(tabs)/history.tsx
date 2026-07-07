import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import { WorkoutSession } from '@/lib/types';
import {
  currentStreak,
  totalVolume,
  sessionVolume,
  computeAchievements,
} from '@/lib/stats';
import { Card, EmptyState, SectionHeader, StatTile } from '@/components/ui';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, spacing } from '@/lib/theme';

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
  const { sessions, deleteSession } = useStore();

  const streak = currentStreak(sessions);
  const volume = totalVolume(sessions);
  const achievements = useMemo(() => computeAchievements(sessions), [sessions]);

  const confirmDelete = (id: string) => {
    Alert.alert('Eliminar registro', '¿Eliminar este entrenamiento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
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
                      <Text style={styles.name}>{item.routineName}</Text>
                      <Text style={styles.date}>{fmtDate(item.date)}</Text>
                    </View>
                    <Text style={styles.meta}>
                      {fmtDuration(item.durationSeconds)} · {exerciseCount} ejercicio
                      {exerciseCount !== 1 ? 's' : ''} · {item.sets.length} series ·{' '}
                      {Math.round(sessionVolume(item))} kg
                    </Text>
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
  hintDelete: { color: colors.surfaceAlt, fontSize: 11, marginTop: spacing.sm },
});
