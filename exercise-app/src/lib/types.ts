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

/** Subgrupo fino para armar splits (empuje/tirón, cuádriceps/posterior). */
export type SubGroup =
  | 'Bíceps'
  | 'Tríceps'
  | 'Cuádriceps'
  | 'Posterior'
  | 'Gemelo';

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
  /** Subgrupo fino (opcional) para el generador de rutinas. */
  subgroup?: SubGroup;
  /** Cardio de bajo impacto (apto para todas las edades). */
  lowImpact?: boolean;
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
  /** Id del plan al que pertenece, si se generó dentro de un plan. */
  planId?: string;
  /** Semana del plan (1..N) a la que pertenece esta rutina. */
  week?: number;
}

/** Ciclo del plan generado por el coach. */
export type Cycle = 'Semanal' | 'Bisemanal' | 'Mensual';

/** Plan generado por el coach; agrupa rutinas por semana y día. */
export interface Plan {
  id: string;
  name: string;
  goal: string;
  days: number;
  age: number;
  createdAt: number;
  routineIds: string[];
  /** Recomendación del coach (descanso + calentamiento). */
  restDays: number;
  schedule: string[];
  warmup: string;
  /** Ciclo (semanal/bisemanal/mensual) y nº de semanas. */
  cycle: Cycle;
  weeks: number;
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
