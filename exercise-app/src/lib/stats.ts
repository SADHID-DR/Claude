import { WorkoutSession } from '@/lib/types';

/** Meta semanal de entrenamientos por defecto. */
export const WEEKLY_GOAL = 4;

/** Saludo según la hora del día. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Clave AAAA-MM-DD local de una fecha, para comparar por día. */
function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Volumen total (peso × reps) de una sesión. */
export function sessionVolume(session: WorkoutSession): number {
  return session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/** Volumen acumulado de todas las sesiones. */
export function totalVolume(sessions: WorkoutSession[]): number {
  return sessions.reduce((sum, s) => sum + sessionVolume(s), 0);
}

/**
 * Racha de días consecutivos entrenando. Cuenta hacia atrás desde hoy;
 * si hoy aún no has entrenado pero ayer sí, la racha sigue viva.
 */
export function currentStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => dayKey(s.date)));

  const oneDay = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Si no hay entreno hoy, empieza a contar desde ayer.
  let cursor = today.getTime();
  if (!days.has(dayKey(cursor))) {
    cursor -= oneDay;
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor -= oneDay;
  }
  return streak;
}

/** Lunes 00:00 de la semana actual. */
function startOfWeek(now = new Date()): number {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Nº de entrenamientos en la semana actual (lun–dom). */
export function weekWorkoutCount(sessions: WorkoutSession[]): number {
  const start = startOfWeek();
  const days = new Set(
    sessions.filter((s) => s.date >= start).map((s) => dayKey(s.date))
  );
  return days.size;
}

/** Entrenamientos por día de la semana actual (para el mini-gráfico). */
export function weekVolumeByDay(sessions: WorkoutSession[]): number[] {
  const start = startOfWeek();
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  sessions
    .filter((s) => s.date >= start)
    .forEach((s) => {
      const d = new Date(s.date);
      const idx = (d.getDay() + 6) % 7;
      buckets[idx] += sessionVolume(s);
    });
  return buckets;
}

export interface MuscleLoad {
  muscle: string;
  sets: number;
}

/**
 * Series efectivas por grupo muscular en la semana actual. Es el "balance
 * de entrenamiento" tipo Fitbod/Home Workout: revela qué músculos has
 * trabajado y cuáles tienes olvidados esta semana. Recibe un resolutor
 * ejercicio→músculo para no acoplar stats con el catálogo.
 */
export function weekMuscleBalance(
  sessions: WorkoutSession[],
  muscleOf: (exerciseId: string) => string | undefined
): Record<string, number> {
  const start = startOfWeek();
  const counts: Record<string, number> = {};
  sessions
    .filter((s) => s.date >= start)
    .forEach((s) => {
      s.sets.forEach((set) => {
        const m = muscleOf(set.exerciseId);
        if (!m || m === 'Cardio') return;
        counts[m] = (counts[m] ?? 0) + 1;
      });
    });
  return counts;
}

export interface ProgressPoint {
  value: number;
  label: string;
}

/**
 * Serie de peso máximo por sesión para un ejercicio, en orden cronológico
 * (de más antigua a más reciente). Alimenta la gráfica de progreso.
 */
export function weightProgressFor(
  sessions: WorkoutSession[],
  exerciseId: string
): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  // sessions viene de más reciente a más antigua: la recorremos al revés.
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    const weights = s.sets.filter((x) => x.exerciseId === exerciseId).map((x) => x.weight);
    if (weights.length === 0) continue;
    const d = new Date(s.date);
    points.push({
      value: Math.max(...weights),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }
  return points;
}

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
}

/** Calcula los logros desbloqueados a partir del historial. */
export function computeAchievements(sessions: WorkoutSession[]): Achievement[] {
  const count = sessions.length;
  const streak = currentStreak(sessions);
  const volume = totalVolume(sessions);
  const maxWeight = Math.max(
    0,
    ...sessions.flatMap((s) => s.sets.map((x) => x.weight))
  );

  return [
    {
      id: 'first',
      emoji: '🎉',
      title: 'Primer paso',
      description: 'Completa tu primer entrenamiento',
      unlocked: count >= 1,
    },
    {
      id: 'streak3',
      emoji: '🔥',
      title: 'En racha',
      description: '3 días seguidos entrenando',
      unlocked: streak >= 3,
    },
    {
      id: 'streak7',
      emoji: '⚡',
      title: 'Semana perfecta',
      description: '7 días seguidos entrenando',
      unlocked: streak >= 7,
    },
    {
      id: 'workouts10',
      emoji: '💪',
      title: 'Constante',
      description: '10 entrenamientos completados',
      unlocked: count >= 10,
    },
    {
      id: 'workouts25',
      emoji: '🏆',
      title: 'Veterano',
      description: '25 entrenamientos completados',
      unlocked: count >= 25,
    },
    {
      id: 'volume10k',
      emoji: '🐘',
      title: 'Toneladas',
      description: 'Levanta 10.000 kg acumulados',
      unlocked: volume >= 10000,
    },
    {
      id: 'strong60',
      emoji: '🦍',
      title: 'Fuerza bruta',
      description: 'Mueve 60 kg o más en una serie',
      unlocked: maxWeight >= 60,
    },
  ];
}

/**
 * Calorías estimadas de una sesión (método MET): fuerza ≈ 5,5 MET,
 * metcon/CrossFit ≈ 8 MET. kcal = MET × 3,5 × peso(kg) / 200 × minutos.
 */
export function estimateKcal(
  durationSeconds: number,
  routineName: string,
  bodyKg: number
): number {
  const minutes = Math.max(1, durationSeconds / 60);
  const met = /crossfit|wod|extra/i.test(routineName) ? 8 : 5.5;
  return Math.round(((met * 3.5 * bodyKg) / 200) * minutes);
}
