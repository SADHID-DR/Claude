import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { Routine } from '@/lib/types';
import { colors, radius, spacing } from '@/lib/theme';

const DOW_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEK_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Lunes 00:00 de la semana que contiene ts. */
function startOfWeekMon(ts: number): number {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export default function PlanCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { plans, routines } = useStore();
  const plan = plans.find((p) => p.id === id);

  const routinesById = useMemo(() => {
    const map: Record<string, Routine> = {};
    routines.forEach((r) => (map[r.id] = r));
    return map;
  }, [routines]);

  const [monthOffset, setMonthOffset] = useState(0);
  const { width } = useWindowDimensions();
  const cellSize = Math.floor((Math.min(width, 640) - spacing.md * 2) / 7);

  if (!plan) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Plan no encontrado.</Text>
      </View>
    );
  }

  const base = new Date();
  const view = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstMon = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lunes
  const planWeekStart = startOfWeekMon(plan.createdAt);
  const todayKey = `${base.getFullYear()}-${base.getMonth()}-${base.getDate()}`;

  // Celdas: nulls de relleno + días del mes.
  const cells: (number | null)[] = [
    ...Array.from({ length: firstMon }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const infoFor = (dayNum: number) => {
    const date = new Date(year, month, dayNum);
    const label = DOW_LABEL[date.getDay()];
    const pos = plan.schedule.indexOf(label);
    if (pos < 0) return null;
    const weeksSince = Math.round((startOfWeekMon(date.getTime()) - planWeekStart) / (7 * 86400000));
    const weekIdx = ((weeksSince % plan.weeks) + plan.weeks) % plan.weeks;
    const routineId = plan.routineIds[weekIdx * plan.days + pos];
    return {
      routine: routinesById[routineId],
      routineId,
      weekIdx,
      dayNum: pos + 1,
      isToday: `${year}-${month}-${dayNum}` === todayKey,
    };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Calendario' }} />

      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.planMeta}>
        {plan.cycle} · entrena {plan.schedule.join(' · ')}
      </Text>

      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonthOffset((m) => m - 1)} hitSlop={10}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={() => setMonthOffset((m) => m + 1)} hitSlop={10}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekHeaderRow}>
        {WEEK_HEADERS.map((h, i) => (
          <Text key={i} style={styles.weekHeader}>
            {h}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((dayNum, i) => {
          if (dayNum == null)
            return <View key={`b-${i}`} style={[styles.cell, { width: cellSize, height: cellSize }]} />;
          const info = infoFor(dayNum);
          const training = !!info;
          const cell = (
            <View
              style={[
                styles.cell,
                styles.cellInner,
                training && styles.cellTraining,
                info?.isToday && styles.cellToday,
              ]}
            >
              <Text style={[styles.cellDay, training && styles.cellDayTraining]}>{dayNum}</Text>
              {training ? (
                <Text style={styles.cellTag}>
                  {plan.weeks > 1 ? `S${info!.weekIdx + 1}·` : ''}D{info!.dayNum}
                </Text>
              ) : null}
            </View>
          );
          return training && info?.routine ? (
            <Pressable
              key={dayNum}
              style={[styles.cell, { width: cellSize, height: cellSize }]}
              onPress={() => router.push(`/session/${info.routineId}`)}
            >
              {cell}
            </Pressable>
          ) : (
            <View key={dayNum} style={[styles.cell, { width: cellSize, height: cellSize }]}>
              {cell}
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Día de entreno (toca para empezar)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.surfaceAlt }]} />
          <Text style={styles.legendText}>Descanso</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  planName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  planMeta: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: 2 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  navArrow: { color: colors.text, fontSize: 30, fontWeight: '900', paddingHorizontal: spacing.md },
  monthTitle: { color: colors.text, fontSize: 18, fontWeight: '800', textTransform: 'capitalize' },
  weekHeaderRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekHeader: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { padding: 2 },
  cellInner: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  cellTraining: { backgroundColor: colors.primarySoft, borderColor: colors.primaryDark },
  cellToday: { borderColor: colors.accent, borderWidth: 2 },
  cellDay: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  cellDayTraining: { color: colors.text },
  cellTag: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  legend: { marginTop: spacing.lg, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 13 },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
