import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getWodById } from '@/data/wods';
import { Button, Card } from '@/components/ui';
import { colors, radius, spacing, wodFormatColors } from '@/lib/theme';

/** Explica en una frase cómo se puntúa cada formato. */
const FORMAT_HELP: Record<string, string> = {
  AMRAP: 'Tantas rondas y reps como puedas en el tiempo indicado.',
  'For Time': 'Completa todo el trabajo lo más rápido posible; tu marca es el tiempo.',
  EMOM: 'Cada minuto, en el minuto: haces las reps y descansas lo que sobre.',
  Rounds: 'Completa el número de rondas indicado.',
};

export default function WodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wod = getWodById(id);

  if (!wod) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>WOD no encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: wod.name }} />

      <View style={styles.headerRow}>
        <View style={[styles.formatPill, { backgroundColor: wodFormatColors[wod.format] }]}>
          <Text style={styles.formatText}>
            {wod.format}
            {wod.minutes ? ` · ${wod.minutes} min` : ''}
          </Text>
        </View>
        {wod.benchmark ? <Text style={styles.badge}>⭐ Benchmark</Text> : null}
      </View>

      <Text style={styles.description}>{wod.description}</Text>
      <Text style={styles.formatHelp}>{FORMAT_HELP[wod.format]}</Text>

      <Card style={styles.wodCard}>
        <Text style={styles.wodHeader}>El entrenamiento</Text>
        {wod.movements.map((line, i) => (
          <Text key={i} style={styles.movement}>
            {line}
          </Text>
        ))}
      </Card>

      <Card style={styles.scalingCard}>
        <Text style={styles.scalingHeader}>🔧 Versión escalada</Text>
        <Text style={styles.scalingText}>{wod.scaling}</Text>
      </Card>

      <Button
        title="Abrir temporizador"
        icon="clock"
        onPress={() => router.push('/timer')}
        style={{ marginVertical: spacing.md }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formatPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.sm },
  formatText: { color: '#0b1220', fontSize: 13, fontWeight: '800' },
  badge: { color: '#fbbf24', fontSize: 13, fontWeight: '700' },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  formatHelp: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  wodCard: { backgroundColor: '#1e2536', borderColor: colors.accent },
  wodHeader: { color: colors.accent, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  movement: { color: colors.text, fontSize: 17, lineHeight: 28, fontWeight: '600' },
  scalingCard: { backgroundColor: '#14251f', borderColor: colors.primaryDark },
  scalingHeader: { color: colors.primary, fontSize: 15, fontWeight: '800', marginBottom: spacing.xs },
  scalingText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
