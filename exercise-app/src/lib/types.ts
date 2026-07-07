export type MuscleGroup =
  | 'Pecho'
  | 'Espalda'
  | 'Piernas'
  | 'Hombros'
  | 'Brazos'
  | 'Core'
  | 'Cardio';

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: string;
  description: string;
  instructions: string[];
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
