import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { getExerciseById } from '@/data/exercises';
import { Button, Card, EmptyState } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

export default function RoutinesScreen() {
  const router = useRouter();
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
                onPress={() => confirmDelete(item.id, item.name)}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="📋"
            title="Aún no tienes rutinas"
            hint="Pulsa 'Generar rutina' para que tu coach te arme una, o crea la tuya."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  exerciseList: { marginTop: spacing.sm, gap: 2 },
  exerciseLine: { color: colors.textMuted, fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
