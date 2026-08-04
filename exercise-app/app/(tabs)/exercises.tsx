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
import { useRouter } from 'expo-router';
import { EXERCISES } from '@/data/exercises';
import { Exercise, MuscleGroup } from '@/lib/types';
import { Card, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ExerciseIcon } from '@/components/ExerciseIcon';
import { ExerciseDemo } from '@/components/ExerciseDemo';
import { colors, radius, spacing, categoryColors, muscleColors } from '@/lib/theme';

// Filtro de equipo granular (barra, mancuernas, kettlebell…).
const EQUIPMENTS = [
  'Todo',
  'Barra',
  'Mancuernas',
  'Kettlebell',
  'Máquina',
  'Peso corporal',
  'CrossFit',
] as const;
type Equip = (typeof EQUIPMENTS)[number];

function matchEquipment(ex: Exercise, eq: Equip): boolean {
  if (eq === 'Todo') return true;
  const t = ex.equipment.toLowerCase();
  switch (eq) {
    case 'Barra':
      return t.includes('barra') && !t.includes('fija');
    case 'Mancuernas':
      return t.includes('mancuerna');
    case 'Kettlebell':
      return t.includes('kettlebell');
    case 'Máquina':
      return ex.category === 'Máquina';
    case 'Peso corporal':
      return ex.category === 'Peso corporal';
    case 'CrossFit':
      return ex.category === 'CrossFit';
    default:
      return true;
  }
}

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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [equip, setEquip] = useState<Equip>('Todo');
  const [muscle, setMuscle] = useState<MuscleGroup | 'Todos'>('Todos');
  // Demostración de técnica abierta (👁) por ejercicio.
  const [demoId, setDemoId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      const matchCategory = matchEquipment(e, equip);
      const matchMuscle = muscle === 'Todos' || e.muscle === muscle;
      const matchQuery =
        q === '' ||
        e.name.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q) ||
        e.muscle.toLowerCase().includes(q);
      return matchCategory && matchMuscle && matchQuery;
    }).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [query, equip, muscle]);

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
        {EQUIPMENTS.map((c) => {
          const active = equip === c;
          return (
            <Pressable
              key={c}
              onPress={() => setEquip(c)}
              style={[styles.chip, active && styles.chipActive]}
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
        {MUSCLES.map((m) => {
          const active = muscle === m;
          const tint = m === 'Todos' ? colors.primary : muscleColors[m] ?? colors.primary;
          return (
            <Pressable
              key={m}
              onPress={() => setMuscle(m)}
              style={[
                styles.chip,
                active && { backgroundColor: tint, borderColor: tint },
              ]}
            >
              {m !== 'Todos' ? (
                <View style={[styles.chipDot, { backgroundColor: active ? '#08130c' : tint }]} />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{m}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        extraData={demoId}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={11}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        ListHeaderComponent={
          <Text style={styles.count}>
            {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''}
          </Text>
        }
        renderItem={({ item }) => (
          <PressableScale onPress={() => router.push(`/exercise/${item.id}`)}>
            <Card>
              <View style={styles.cardRow}>
                <ExerciseIcon exercise={item} />
                <View style={{ flex: 1 }}>
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Tag label={item.muscle} />
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.category, { color: categoryColors[item.category] }]}>
                      {item.category}
                    </Text>
                    <Text style={styles.equipment} numberOfLines={1}>
                      · {item.equipment}
                    </Text>
                  </View>
                  <Text style={styles.difficulty}>{item.difficulty}</Text>
                </View>
                <Pressable
                  onPress={() => setDemoId((d) => (d === item.id ? null : item.id))}
                  hitSlop={12}
                  style={styles.eyeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={demoId === item.id ? 'Ocultar técnica' : 'Ver técnica'}
                >
                  <Icon name={demoId === item.id ? 'close' : 'eye'} size={20} color={demoId === item.id ? colors.textMuted : colors.accent} />
                </Pressable>
              </View>
              {demoId === item.id ? (
                <View style={styles.demoWrap}>
                  <ExerciseDemo exercise={item} size={150} />
                </View>
              ) : null}
            </Card>
          </PressableScale>
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
  chips: { flexGrow: 0, minHeight: 46, marginBottom: spacing.sm },
  chipsContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    paddingVertical: 3,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipDot: { width: 9, height: 9, borderRadius: 5 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13, lineHeight: 18 },
  chipTextActive: { color: '#0b1220' },
  count: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: 4 },
  category: { fontSize: 13, fontWeight: '700' },
  equipment: { color: colors.textMuted, fontSize: 13, flexShrink: 1 },
  difficulty: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  eyeBtn: {
    width: 34,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeText: { fontSize: 15 },
  demoWrap: { alignItems: 'center', marginTop: spacing.sm },
});
