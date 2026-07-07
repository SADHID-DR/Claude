import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { getExerciseById } from '@/data/exercises';
import { Tag } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExerciseById(id);

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Ejercicio no encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: exercise.name }} />

      <View style={styles.headerRow}>
        <Tag label={exercise.muscle} />
        <Text style={styles.equipment}>{exercise.equipment}</Text>
      </View>

      <Text style={styles.description}>{exercise.description}</Text>

      <Text style={styles.sectionTitle}>Instrucciones</Text>
      {exercise.instructions.map((step, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepNumber}>{i + 1}</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  equipment: { color: colors.textMuted, fontSize: 14 },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    color: '#0b1220',
    backgroundColor: colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '800',
  },
  stepText: { color: colors.text, fontSize: 15, flex: 1, lineHeight: 22 },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
