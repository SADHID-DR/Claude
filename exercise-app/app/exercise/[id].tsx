import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { getExerciseById } from '@/data/exercises';
import { useStore } from '@/lib/store';
import { weightProgressFor } from '@/lib/stats';
import { Card, Tag } from '@/components/ui';
import { LineChart } from '@/components/LineChart';
import { colors, radius, spacing, categoryColors } from '@/lib/theme';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions } = useStore();
  const exercise = getExerciseById(id);
  const progress = weightProgressFor(sessions, id);

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
        <View style={[styles.pill, { borderColor: categoryColors[exercise.category] }]}>
          <Text style={[styles.pillText, { color: categoryColors[exercise.category] }]}>
            {exercise.category}
          </Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillTextMuted}>{exercise.difficulty}</Text>
        </View>
      </View>

      <Text style={styles.equipment}>🏋️ {exercise.equipment}</Text>
      <Text style={styles.description}>{exercise.description}</Text>

      {/* Progreso: evolución del peso máximo por sesión */}
      {progress.length >= 2 ? (
        <Card style={styles.progressCard}>
          <Text style={styles.progressHeader}>📈 Tu progreso</Text>
          <LineChart data={progress} unit=" kg" />
        </Card>
      ) : null}

      {/* Coach: cómo elegir el peso / ajustar la máquina */}
      <Card style={styles.coachCard}>
        <Text style={styles.coachHeader}>🎯 Guía de peso / máquina</Text>
        <Text style={styles.coachText}>{exercise.weightGuide}</Text>
      </Card>

      <Text style={styles.sectionTitle}>Instrucciones</Text>
      {exercise.instructions.map((step, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepNumber}>{i + 1}</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}

      {/* Coach: consejos de técnica */}
      <Card style={styles.tipsCard}>
        <Text style={styles.tipsHeader}>💡 Consejos del entrenador</Text>
        {exercise.coachTips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextMuted: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  equipment: { color: colors.textMuted, fontSize: 14 },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  progressCard: { alignItems: 'center' },
  progressHeader: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  coachCard: { backgroundColor: '#14251f', borderColor: colors.primaryDark },
  coachHeader: { color: colors.primary, fontSize: 15, fontWeight: '800', marginBottom: spacing.xs },
  coachText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
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
  tipsCard: { backgroundColor: '#1e2536', borderColor: colors.accent },
  tipsHeader: { color: colors.accent, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  tipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  tipBullet: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  tipText: { color: colors.text, fontSize: 15, flex: 1, lineHeight: 22 },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
