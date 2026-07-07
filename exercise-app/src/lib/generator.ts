import { EXERCISES } from '@/data/exercises';
import { Category, Exercise, MuscleGroup, RoutineExercise } from '@/lib/types';

export type Goal = 'Fuerza' | 'Hipertrofia' | 'Pérdida de grasa';
export type Focus = 'Cuerpo completo' | 'Tren superior' | 'Tren inferior';

interface GoalParams {
  sets: number;
  reps: number;
  rest: number;
  /** Categorías preferidas, en orden de prioridad. */
  prefer: Category[];
  description: string;
}

const GOAL_PARAMS: Record<Goal, GoalParams> = {
  Fuerza: {
    sets: 5,
    reps: 5,
    rest: 180,
    prefer: ['Peso libre', 'Máquina'],
    description: 'Series pesadas de pocas repeticiones y descansos largos.',
  },
  Hipertrofia: {
    sets: 4,
    reps: 10,
    rest: 75,
    prefer: ['Peso libre', 'Máquina', 'Peso corporal'],
    description: 'Volumen moderado, 8–12 reps y descansos medios.',
  },
  'Pérdida de grasa': {
    sets: 3,
    reps: 15,
    rest: 40,
    prefer: ['CrossFit', 'Peso corporal', 'Máquina'],
    description: 'Circuito de muchas repeticiones y descansos cortos.',
  },
};

const FOCUS_MUSCLES: Record<Focus, MuscleGroup[]> = {
  'Cuerpo completo': ['Piernas', 'Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core'],
  'Tren superior': ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core', 'Pecho'],
  'Tren inferior': ['Piernas', 'Piernas', 'Core', 'Piernas', 'Cardio'],
};

/** Elige el mejor ejercicio para un músculo según las categorías preferidas. */
function pickForMuscle(
  muscle: MuscleGroup,
  prefer: Category[],
  used: Set<string>
): Exercise | null {
  const candidates = EXERCISES.filter((e) => e.muscle === muscle && !used.has(e.id));
  if (candidates.length === 0) return null;
  for (const cat of prefer) {
    const match = candidates.filter((e) => e.category === cat);
    if (match.length > 0) {
      return match[Math.floor(Math.random() * match.length)];
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export interface GeneratedRoutine {
  name: string;
  description: string;
  exercises: RoutineExercise[];
}

/**
 * Genera una rutina a partir de un objetivo y un enfoque, eligiendo ejercicios
 * del catálogo y aplicando el esquema de series/reps/descanso adecuado.
 */
export function generateRoutine(goal: Goal, focus: Focus): GeneratedRoutine {
  const params = GOAL_PARAMS[goal];
  const muscles = FOCUS_MUSCLES[focus];
  const used = new Set<string>();
  const exercises: RoutineExercise[] = [];

  for (const muscle of muscles) {
    const ex = pickForMuscle(muscle, params.prefer, used);
    if (ex) {
      used.add(ex.id);
      exercises.push({
        exerciseId: ex.id,
        sets: params.sets,
        reps: params.reps,
        restSeconds: params.rest,
      });
    }
  }

  return {
    name: `${goal} · ${focus}`,
    description: params.description,
    exercises,
  };
}

export const GOALS: Goal[] = ['Fuerza', 'Hipertrofia', 'Pérdida de grasa'];
export const FOCUSES: Focus[] = ['Cuerpo completo', 'Tren superior', 'Tren inferior'];
export { GOAL_PARAMS };
