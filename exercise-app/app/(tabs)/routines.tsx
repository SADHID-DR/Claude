import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import { Button, Card, EmptyState } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

export default function RoutinesScreen() {
  const { routines, deleteRoutine } = useStore();

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Eliminar rutina', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRoutine(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        ListHeaderComponent={
          <Link href="/routine/new" asChild>
            <Button title="＋ Nueva rutina" onPress={() => {}} style={{ marginBottom: spacing.sm }} />
          </Link>
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.exercises.length} ejercicio{item.exercises.length !== 1 ? 's' : ''}
            </Text>
            <View style={styles.exerciseList}>
              {item.exercises.map((re, i) => {
                const ex = getExerciseById(re.exerciseId);
                return (
                  <Text key={i} style={styles.exerciseLine}>
                    • {ex?.name ?? 'Ejercicio'} — {re.sets}×{re.reps}
                  </Text>
                );
              })}
            </View>
            <View style={styles.actions}>
              <Link href={`/session/${item.id}`} asChild>
                <Button title="▶ Entrenar" onPress={() => {}} style={{ flex: 1 }} />
              </Link>
              <Button
                title="Eliminar"
                variant="danger"
                onPress={() => confirmDelete(item.id, item.name)}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Aún no tienes rutinas"
            hint="Crea tu primera rutina combinando ejercicios del catálogo."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  exerciseList: { marginTop: spacing.sm, gap: 2 },
  exerciseLine: { color: colors.textMuted, fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
