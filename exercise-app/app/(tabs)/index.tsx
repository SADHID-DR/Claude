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
import { Category, MuscleGroup } from '@/lib/types';
import { Card, Tag } from '@/components/ui';
import { colors, radius, spacing, categoryColors } from '@/lib/theme';

const CATEGORIES: (Category | 'Todo')[] = [
  'Todo',
  'Máquina',
  'Peso libre',
  'Peso corporal',
  'CrossFit',
];

const MUSCLES: (MuscleGroup | 'Todos')[] = [
  'Todos',
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Core',
  'Cuerpo completo',
  'Cardio',
];

export default function ExercisesScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'Todo'>('Todo');
  const [muscle, setMuscle] = useState<MuscleGroup | 'Todos'>('Todos');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      const matchCategory = category === 'Todo' || e.category === category;
      const matchMuscle = muscle === 'Todos' || e.muscle === muscle;
      const matchQuery = q === '' || e.name.toLowerCase().includes(q);
      return matchCategory && matchMuscle && matchQuery;
    });
  }, [query, category, muscle]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Buscar ejercicio..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      <Text style={styles.filterLabel}>Equipo</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}
      >
        {CATEGORIES.map((c) => {
          const active = category === c;
          const tint = c !== 'Todo' ? categoryColors[c] : colors.primary;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[
                styles.chip,
                active && { backgroundColor: tint, borderColor: tint },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.filterLabel}>Músculo</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}
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
        ListHeaderComponent={
          <Text style={styles.count}>
            {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''}
          </Text>
        }
        renderItem={({ item }) => (
          <Link href={`/exercise/${item.id}`} asChild>
            <Pressable>
              <Card>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Tag label={item.muscle} />
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.category, { color: categoryColors[item.category] }]}>
                    {item.category}
                  </Text>
                  <Text style={styles.equipment}>· {item.equipment}</Text>
                </View>
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
  filterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  chips: { flexGrow: 0, marginBottom: spacing.sm },
  chipsContent: { gap: spacing.sm, paddingHorizontal: spacing.md },
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
  count: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: 4 },
  category: { fontSize: 13, fontWeight: '700' },
  equipment: { color: colors.textMuted, fontSize: 13 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
