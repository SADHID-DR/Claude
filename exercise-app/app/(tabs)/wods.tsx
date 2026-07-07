import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { WODS } from '@/data/wods';
import { WodFormat } from '@/lib/types';
import { Card } from '@/components/ui';
import { colors, radius, spacing, wodFormatColors } from '@/lib/theme';

const FILTERS: (WodFormat | 'Todos' | 'Benchmark')[] = [
  'Todos',
  'Benchmark',
  'AMRAP',
  'For Time',
  'EMOM',
];

export default function WodsScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Todos');

  const filtered = useMemo(() => {
    return WODS.filter((w) => {
      if (filter === 'Todos') return true;
      if (filter === 'Benchmark') return w.benchmark;
      return w.format === filter;
    });
  }, [filter]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Link href={`/wod/${item.id}`} asChild>
            <Pressable>
              <Card>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View
                    style={[
                      styles.formatPill,
                      { backgroundColor: wodFormatColors[item.format] },
                    ]}
                  >
                    <Text style={styles.formatText}>
                      {item.format}
                      {item.minutes ? ` ${item.minutes}'` : ''}
                    </Text>
                  </View>
                </View>
                {item.benchmark ? <Text style={styles.badge}>⭐ Benchmark</Text> : null}
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
              </Card>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  chips: { flexGrow: 0, marginTop: spacing.md },
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 },
  formatPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  formatText: { color: '#0b1220', fontSize: 12, fontWeight: '800' },
  badge: { color: '#fbbf24', fontSize: 12, fontWeight: '700', marginTop: 2 },
  desc: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
});
