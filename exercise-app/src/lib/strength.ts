import { LoggedSet, WorkoutSession } from '@/lib/types';

/**
 * Motor de fuerza del coach: 1RM estimado (fórmula de Epley), récords
 * personales, zonas de trabajo por objetivo y calentamiento calculado.
 * Es lo que usaría un entrenador técnico con calculadora en mano.
 */

/** Redondea al múltiplo de 2,5 kg más cercano (discos reales). */
export function roundPlate(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

/**
 * 1RM estimado con Epley: peso × (1 + reps/30). Solo es fiable hasta
 * ~12 repeticiones; por encima devolvemos null para no inflar cifras.
 */
export function epley1RM(weight: number, reps: number): number | null {
  if (weight <= 0 || reps <= 0 || reps > 12) return null;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface PR {
  exerciseId: string;
  /** 1RM estimado (kg). */
  e1rm: number;
  /** La serie que lo produjo. */
  weight: number;
  reps: number;
  date: number;
}

/** Mejor marca (e1RM) por ejercicio en todo el historial. */
export function allPRs(sessions: WorkoutSession[]): Record<string, PR> {
  const best: Record<string, PR> = {};
  sessions.forEach((s) => {
    s.sets.forEach((set) => {
      const e = epley1RM(set.weight, set.reps);
      if (e == null) return;
      const cur = best[set.exerciseId];
      if (!cur || e > cur.e1rm) {
        best[set.exerciseId] = {
          exerciseId: set.exerciseId,
          e1rm: e,
          weight: set.weight,
          reps: set.reps,
          date: s.date,
        };
      }
    });
  });
  return best;
}

/** e1RM actual de un ejercicio, o null si no hay datos útiles. */
export function e1rmFor(sessions: WorkoutSession[], exerciseId: string): number | null {
  let best: number | null = null;
  sessions.forEach((s) => {
    s.sets.forEach((set) => {
      if (set.exerciseId !== exerciseId) return;
      const e = epley1RM(set.weight, set.reps);
      if (e != null && (best == null || e > best)) best = e;
    });
  });
  return best;
}

/**
 * Compara las series recién registradas con el historial y devuelve los
 * récords nuevos (un PR por ejercicio, el mejor de la sesión).
 */
export function detectNewPRs(
  previous: WorkoutSession[],
  logged: LoggedSet[]
): PR[] {
  const history = allPRs(previous);
  const fresh: Record<string, PR> = {};
  logged.forEach((set) => {
    const e = epley1RM(set.weight, set.reps);
    if (e == null) return;
    const prev = history[set.exerciseId];
    if (prev && e <= prev.e1rm) return;
    const cur = fresh[set.exerciseId];
    if (!cur || e > cur.e1rm) {
      fresh[set.exerciseId] = {
        exerciseId: set.exerciseId,
        e1rm: e,
        weight: set.weight,
        reps: set.reps,
        date: Date.now(),
      };
    }
  });
  return Object.values(fresh);
}

export interface TrainingZone {
  name: string;
  reps: string;
  pctLow: number;
  pctHigh: number;
}

/** Zonas clásicas de entrenamiento en % del 1RM. */
export const ZONES: TrainingZone[] = [
  { name: 'Fuerza', reps: '3–6 reps', pctLow: 0.8, pctHigh: 0.9 },
  { name: 'Hipertrofia', reps: '8–12 reps', pctLow: 0.67, pctHigh: 0.8 },
  { name: 'Resistencia', reps: '15+ reps', pctLow: 0.5, pctHigh: 0.6 },
];

/** Rango de kg para una zona a partir del e1RM. */
export function zoneKg(e1rm: number, zone: TrainingZone): [number, number] {
  return [roundPlate(e1rm * zone.pctLow), roundPlate(e1rm * zone.pctHigh)];
}

export interface WarmupSet {
  pct: number;
  kg: number;
  reps: number;
}

/**
 * Calentamiento de aproximación para un peso de trabajo dado:
 * 40%×8 → 60%×5 → 80%×3, redondeado a discos. Con cargas ligeras
 * (<25 kg) basta una serie con la barra o la mitad del peso.
 */
export function warmupPlan(workingKg: number): WarmupSet[] {
  if (workingKg < 25) {
    return [{ pct: 0.5, kg: Math.max(0, roundPlate(workingKg * 0.5)), reps: 10 }];
  }
  return [
    { pct: 0.4, kg: roundPlate(workingKg * 0.4), reps: 8 },
    { pct: 0.6, kg: roundPlate(workingKg * 0.6), reps: 5 },
    { pct: 0.8, kg: roundPlate(workingKg * 0.8), reps: 3 },
  ];
}
