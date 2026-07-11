import { WorkoutSession } from '@/lib/types';
import { WeightUnit, fmtWeight, roundLoad, toDisplay } from '@/lib/units';

/**
 * Devuelve el mayor peso registrado para un ejercicio en la sesión más
 * reciente que lo incluya. Sirve para pre-rellenar el peso sugerido y que
 * la app funcione como un entrenador que recuerda tu último entrenamiento.
 * Se asume que `sessions` viene ordenada de más reciente a más antigua.
 */
export function lastWeightFor(
  sessions: WorkoutSession[],
  exerciseId: string
): number | null {
  for (const session of sessions) {
    const weights = session.sets
      .filter((s) => s.exerciseId === exerciseId)
      .map((s) => s.weight);
    if (weights.length > 0) {
      return Math.max(...weights);
    }
  }
  return null;
}

/**
 * Consejo del coach sobre la progresión: si ya entrenaste este ejercicio,
 * sugiere mantener o subir ligeramente el peso.
 */
export function progressionHint(
  lastWeight: number | null,
  unit: WeightUnit = 'kg'
): string {
  if (lastWeight == null) {
    return 'Primera vez: elige un peso con el que completes las reps con buena técnica.';
  }
  if (lastWeight === 0) {
    return 'La última vez fue a peso corporal. Si lo dominas, añade algo de carga.';
  }
  const nextDisplay = roundLoad(toDisplay(lastWeight * 1.025, unit), unit);
  return `La última vez usaste ${fmtWeight(lastWeight, unit)}. Si completaste todas las series, prueba ${nextDisplay} ${unit}.`;
}

export interface Prescription {
  /** Peso prescrito para hoy (kg) o null si es la primera vez. */
  weightKg: number | null;
  /** true si la última vez completaste el objetivo y hoy toca subir. */
  levelUp: boolean;
}

/**
 * Doble progresión: si en tu última sesión completaste TODAS las series de
 * este ejercicio al objetivo de reps (o más), hoy la app te sube el peso
 * (+2,5 kg); si no, repites el mismo peso hasta dominarlo.
 */
export function doubleProgression(
  sessions: WorkoutSession[],
  exerciseId: string,
  targetReps: number
): Prescription {
  for (const session of sessions) {
    const sets = session.sets.filter((x) => x.exerciseId === exerciseId);
    if (sets.length === 0) continue;
    const top = Math.max(...sets.map((x) => x.weight));
    if (top <= 0) return { weightKg: null, levelUp: false };
    const done = sets.every((x) => x.reps >= targetReps);
    return done
      ? { weightKg: top + 2.5, levelUp: true }
      : { weightKg: top, levelUp: false };
  }
  return { weightKg: null, levelUp: false };
}
