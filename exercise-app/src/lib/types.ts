export type MuscleGroup =
  | 'Pecho'
  | 'Espalda'
  | 'Piernas'
  | 'Hombros'
  | 'Brazos'
  | 'Core'
  | 'Cardio'
  | 'Cuerpo completo';

/** Tipo de equipo, para elegir qué pesas y máquinas usar. */
export type Category = 'Máquina' | 'Peso libre' | 'Peso corporal' | 'CrossFit';

export type Difficulty = 'Principiante' | 'Intermedio' | 'Avanzado';

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  category: Category;
  equipment: string;
  difficulty: Difficulty;
  description: string;
  instructions: string[];
  /** Consejos de técnica del entrenador. */
  coachTips: string[];
  /** Cómo elegir el peso o ajustar la máquina. */
  weightGuide: string;
}

/** Formato de un WOD de CrossFit. */
export type WodFormat = 'AMRAP' | 'For Time' | 'EMOM' | 'Rounds';

export interface Wod {
  id: string;
  name: string;
  format: WodFormat;
  /** Tope de tiempo o duración en minutos (según el formato). */
  minutes?: number;
  description: string;
  /** Líneas del entrenamiento (ej. "21-15-9 Thrusters 43 kg"). */
  movements: string[];
  /** Versión escalada para principiantes. */
  scaling: string;
  /** WOD benchmark clásico ("The Girls", héroes...). */
  benchmark: boolean;
}

/** Un ejercicio dentro de una rutina, con su prescripción. */
export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  createdAt: number;
}

/** Serie registrada dentro de una sesión de entrenamiento. */
export interface LoggedSet {
  exerciseId: string;
  weight: number;
  reps: number;
}

export interface WorkoutSession {
  id: string;
  routineId?: string;
  routineName: string;
  date: number;
  durationSeconds: number;
  sets: LoggedSet[];
}
