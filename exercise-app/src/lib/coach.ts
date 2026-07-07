import { WorkoutSession } from '@/lib/types';

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
export function progressionHint(lastWeight: number | null): string {
  if (lastWeight == null) {
    return 'Primera vez: elige un peso con el que completes las reps con buena técnica.';
  }
  if (lastWeight === 0) {
    return 'La última vez fue a peso corporal. Si lo dominas, añade algo de carga.';
  }
  const next = Math.round((lastWeight + lastWeight * 0.025) * 2) / 2;
  return `La última vez usaste ${lastWeight} kg. Si completaste todas las series, prueba ${next} kg.`;
}
