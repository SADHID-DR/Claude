import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import { WorkoutSession } from '@/lib/types';
import { Card, EmptyState } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m} min` : `${seconds} s`;
}

/** Resumen de volumen total (peso × reps) de una sesión. */
function totalVolume(session: WorkoutSession): number {
  return session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export default function HistoryScreen() {
  const { sessions, deleteSession } = useStore();

  const confirmDelete = (id: string) => {
    Alert.alert('Eliminar registro', '¿Eliminar este entrenamiento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  };

  const totalWorkouts = sessions.length;

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        ListHeaderComponent={
          totalWorkouts > 0 ? (
            <Card style={styles.summary}>
              <Text style={styles.summaryNumber}>{totalWorkouts}</Text>
              <Text style={styles.summaryLabel}>
                entrenamiento{totalWorkouts !== 1 ? 's' : ''} registrado
                {totalWorkouts !== 1 ? 's' : ''}
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item }) => {
          const exerciseCount = new Set(item.sets.map((s) => s.exerciseId)).size;
          return (
            <Pressable onLongPress={() => confirmDelete(item.id)}>
              <Card>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.routineName}</Text>
                  <Text style={styles.date}>{fmtDate(item.date)}</Text>
                </View>
                <Text style={styles.meta}>
                  {fmtDuration(item.durationSeconds)} · {exerciseCount} ejercicio
                  {exerciseCount !== 1 ? 's' : ''} · {item.sets.length} series
                </Text>
                <Text style={styles.volume}>
                  Volumen total: {Math.round(totalVolume(item))} kg
                </Text>
                <View style={styles.sets}>
                  {item.sets.slice(0, 6).map((s, i) => {
                    const ex = getExerciseById(s.exerciseId);
                    return (
                      <Text key={i} style={styles.setLine}>
                        • {ex?.name ?? 'Ejercicio'}: {s.weight}kg × {s.reps}
                      </Text>
                    );
                  })}
                  {item.sets.length > 6 ? (
                    <Text style={styles.setLine}>… +{item.sets.length - 6} más</Text>
                  ) : null}
                </View>
                <Text style={styles.hintDelete}>Mantén pulsado para eliminar</Text>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="Sin entrenamientos todavía"
            hint="Inicia una rutina y pulsa 'Entrenar' para registrar tu primera sesión."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summary: { alignItems: 'center', marginBottom: spacing.sm },
  summaryNumber: { color: colors.primary, fontSize: 36, fontWeight: '900' },
  summaryLabel: { color: colors.textMuted, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  date: { color: colors.textMuted, fontSize: 13 },
  meta: { color: colors.accent, fontSize: 13, marginTop: 2 },
  volume: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  sets: { marginTop: spacing.sm, gap: 2 },
  setLine: { color: colors.textMuted, fontSize: 13 },
  hintDelete: { color: colors.surfaceAlt, fontSize: 11, marginTop: spacing.sm },
});
