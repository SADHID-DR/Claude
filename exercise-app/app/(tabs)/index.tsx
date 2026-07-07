import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { EXERCISES } from '@/data/exercises';
import { MuscleGroup } from '@/lib/types';
import { Card, Tag } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

const MUSCLES: (MuscleGroup | 'Todos')[] = [
  'Todos',
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Core',
  'Cardio',
];

export default function ExercisesScreen() {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'Todos'>('Todos');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      const matchMuscle = muscle === 'Todos' || e.muscle === muscle;
      const matchQuery = q === '' || e.name.toLowerCase().includes(q);
      return matchMuscle && matchQuery;
    });
  }, [query, muscle]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Buscar ejercicio..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
      >
        {MUSCLES.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMuscle(m)}
            style={[styles.chip, muscle === m && styles.chipActive]}
          >
            <Text style={[styles.chipText, muscle === m && styles.chipTextActive]}>
              {m}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Link href={`/exercise/${item.id}`} asChild>
            <Pressable>
              <Card>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Tag label={item.muscle} />
                </View>
                <Text style={styles.equipment}>{item.equipment}</Text>
              </Card>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay ejercicios que coincidan.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { flexGrow: 0, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#0b1220' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  equipment: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
