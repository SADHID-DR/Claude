import { EXERCISES, getExerciseById } from '@/data/exercises';
import { Category, Exercise, RoutineExercise } from '@/lib/types';

export type Goal = 'Fuerza' | 'Hipertrofia' | 'Pérdida de grasa';
export type Priority = 'Más pierna' | 'Más abdominales' | 'Más cardio';

export const GOALS: Goal[] = ['Fuerza', 'Hipertrofia', 'Pérdida de grasa'];
export const PRIORITIES: Priority[] = ['Más pierna', 'Más abdominales', 'Más cardio'];
export const DAY_OPTIONS = [2, 3, 4, 5, 6];

interface GoalParams {
  sets: number;
  reps: number;
  rest: number;
  exercisesPerDay: number;
  prefer: Category[];
  summary: string;
}

const GOAL_PARAMS: Record<Goal, GoalParams> = {
  Fuerza: {
    sets: 5,
    reps: 5,
    rest: 180,
    exercisesPerDay: 4,
    prefer: ['Peso libre', 'Máquina'],
    summary: 'Básicos pesados, pocas reps y descansos largos.',
  },
  Hipertrofia: {
    sets: 4,
    reps: 10,
    rest: 75,
    exercisesPerDay: 5,
    prefer: ['Peso libre', 'Máquina', 'Peso corporal'],
    summary: 'Volumen moderado, 8–12 reps y descansos medios.',
  },
  'Pérdida de grasa': {
    sets: 3,
    reps: 15,
    rest: 45,
    exercisesPerDay: 5,
    prefer: ['Máquina', 'Peso corporal', 'CrossFit'],
    summary: 'Muchas reps, descansos cortos y cardio para quemar.',
  },
};

// ─────────────────────────────── Edad (premium) ──────────────────────────────
type AgeBand = 'joven' | 'adulto' | 'maduro' | 'senior';

function ageBand(age: number): AgeBand {
  if (age < 30) return 'joven';
  if (age < 45) return 'adulto';
  if (age < 60) return 'maduro';
  return 'senior';
}

interface AgeAdj {
  restMult: number;
  repAdd: number;
  preferSafe: boolean;
  note: string;
}

const AGE_ADJ: Record<AgeBand, AgeAdj> = {
  joven: {
    restMult: 1,
    repAdd: 0,
    preferSafe: false,
    note: 'Puedes entrenar con intensidad alta; cuida siempre la técnica.',
  },
  adulto: {
    restMult: 1.05,
    repAdd: 0,
    preferSafe: false,
    note: 'Calienta bien y progresa de forma gradual para evitar lesiones.',
  },
  maduro: {
    restMult: 1.2,
    repAdd: 2,
    preferSafe: true,
    note: 'Rangos algo más altos, más descanso y máquinas para cuidar las articulaciones.',
  },
  senior: {
    restMult: 1.35,
    repAdd: 4,
    preferSafe: true,
    note: 'Prioridad a máquinas y control; evita cargas máximas y calienta a conciencia.',
  },
};

// ───────────────────────────────── Pools ─────────────────────────────────────
type PoolKey =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'back'
  | 'biceps'
  | 'quad'
  | 'posterior'
  | 'calf'
  | 'core'
  | 'cardio';

function poolFor(key: PoolKey): Exercise[] {
  switch (key) {
    case 'chest':
      return EXERCISES.filter((e) => e.muscle === 'Pecho');
    case 'shoulders':
      return EXERCISES.filter((e) => e.muscle === 'Hombros');
    case 'triceps':
      return EXERCISES.filter((e) => e.subgroup === 'Tríceps');
    case 'back':
      return EXERCISES.filter((e) => e.muscle === 'Espalda');
    case 'biceps':
      return EXERCISES.filter((e) => e.subgroup === 'Bíceps');
    case 'quad':
      return EXERCISES.filter((e) => e.muscle === 'Piernas' && e.subgroup === 'Cuádriceps');
    case 'posterior':
      return EXERCISES.filter((e) => e.muscle === 'Piernas' && e.subgroup === 'Posterior');
    case 'calf':
      return EXERCISES.filter((e) => e.subgroup === 'Gemelo');
    case 'core':
      return EXERCISES.filter((e) => e.muscle === 'Core');
    case 'cardio':
      return EXERCISES.filter((e) => e.muscle === 'Cardio');
  }
}

const CARDIO_LOW = ['ex-rowing', 'ex-stair-climber', 'ex-jump-rope', 'ex-running'];
const CARDIO_ALL = [
  ...CARDIO_LOW,
  'ex-double-under',
  'ex-box-jump',
  'ex-burpee',
  'ex-mountain-climber',
];

function pick(pool: Exercise[], prefer: Category[], used: Set<string>): Exercise | null {
  const avail = pool.filter((e) => !used.has(e.id));
  const from = avail.length > 0 ? avail : pool;
  if (from.length === 0) return null;
  for (const cat of prefer) {
    const m = from.filter((e) => e.category === cat);
    if (m.length) return m[Math.floor(Math.random() * m.length)];
  }
  return from[Math.floor(Math.random() * from.length)];
}

function pickCardio(band: AgeBand, used: Set<string>): Exercise | null {
  const ids = band === 'maduro' || band === 'senior' ? CARDIO_LOW : CARDIO_ALL;
  const pool = ids.map(getExerciseById).filter(Boolean) as Exercise[];
  return pick(pool, ['Máquina', 'Peso corporal', 'CrossFit'], used);
}

/** Prescripción para cardio: máquinas por tiempo, explosivos por reps. */
function cardioPrescription(ex: Exercise): RoutineExercise {
  const machine = ex.category === 'Máquina' || ex.id === 'ex-running';
  return machine
    ? { exerciseId: ex.id, sets: 1, reps: 12, restSeconds: 60 }
    : { exerciseId: ex.id, sets: 3, reps: 20, restSeconds: 45 };
}

// ──────────────────────────────── Splits ─────────────────────────────────────
interface DayTemplate {
  key: string;
  name: string;
  focus: string;
  slots: PoolKey[];
}

const PUSH: DayTemplate = {
  key: 'push',
  name: 'Empuje',
  focus: 'Pecho · Hombro · Tríceps',
  slots: ['chest', 'chest', 'shoulders', 'triceps', 'triceps'],
};
const PULL: DayTemplate = {
  key: 'pull',
  name: 'Tirón',
  focus: 'Espalda · Bíceps',
  slots: ['back', 'back', 'back', 'biceps', 'biceps'],
};
const LEGS: DayTemplate = {
  key: 'legs',
  name: 'Pierna',
  focus: 'Piernas completas',
  slots: ['quad', 'quad', 'posterior', 'calf', 'core'],
};
const LEGS_Q: DayTemplate = {
  key: 'legsQ',
  name: 'Pierna (cuádriceps)',
  focus: 'Cuádriceps · Gemelo',
  slots: ['quad', 'quad', 'quad', 'calf', 'core'],
};
const LEGS_P: DayTemplate = {
  key: 'legsP',
  name: 'Pierna (posterior)',
  focus: 'Femoral · Glúteo',
  slots: ['posterior', 'posterior', 'quad', 'calf', 'core'],
};
const UPPER: DayTemplate = {
  key: 'upper',
  name: 'Tren superior',
  focus: 'Pecho · Espalda · Hombro · Brazos',
  slots: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
};
const LOWER: DayTemplate = {
  key: 'lower',
  name: 'Tren inferior + core',
  focus: 'Piernas · Core',
  slots: ['quad', 'posterior', 'quad', 'calf', 'core'],
};
const CORE_CARDIO: DayTemplate = {
  key: 'coreCardio',
  name: 'Abdominales + Cardio',
  focus: 'Core · Cardio',
  slots: ['core', 'core', 'core', 'cardio', 'cardio'],
};

function splitFor(days: number): DayTemplate[] {
  switch (days) {
    case 2:
      return [UPPER, LOWER];
    case 3:
      return [PUSH, PULL, LEGS];
    case 4:
      return [PUSH, PULL, LEGS, CORE_CARDIO];
    case 5:
      return [PUSH, PULL, LEGS_Q, CORE_CARDIO, LEGS_P];
    case 6:
      return [PUSH, PULL, LEGS_Q, PUSH, PULL, LEGS_P];
    default:
      return [PUSH, PULL, LEGS];
  }
}

// ─────────────────────────────── Generación ──────────────────────────────────
export interface PlanInput {
  days: number;
  goal: Goal;
  age: number;
  priorities: Priority[];
}

export interface PlanDay {
  key: string;
  name: string;
  focus: string;
  exercises: RoutineExercise[];
}

export interface WeeklyPlan {
  title: string;
  summary: string;
  ageNote: string;
  goal: Goal;
  days: PlanDay[];
}

function buildDay(
  tpl: DayTemplate,
  goal: Goal,
  band: AgeBand,
  priorities: Priority[]
): PlanDay {
  const gp = GOAL_PARAMS[goal];
  const adj = AGE_ADJ[band];
  const prefer: Category[] = adj.preferSafe
    ? ['Máquina', 'Peso corporal', 'Peso libre', 'CrossFit']
    : gp.prefer;
  const reps = gp.reps + adj.repAdd;
  const rest = Math.round((gp.rest * adj.restMult) / 5) * 5;
  const sets = gp.sets;
  const used = new Set<string>();
  const exercises: RoutineExercise[] = [];

  const target = tpl.key === 'coreCardio' ? 5 : gp.exercisesPerDay;

  const add = (ex: Exercise, asCardio = false) => {
    used.add(ex.id);
    if (asCardio || ex.muscle === 'Cardio') {
      exercises.push(cardioPrescription(ex));
    } else {
      const r = ex.muscle === 'Core' ? Math.max(reps, 15) : reps;
      exercises.push({ exerciseId: ex.id, sets, reps: r, restSeconds: rest });
    }
  };

  for (const slot of tpl.slots) {
    if (exercises.length >= target) break;
    const ex = pick(poolFor(slot), prefer, used);
    if (ex) add(ex, slot === 'cardio');
  }

  const hasCore = () =>
    exercises.some((e) => getExerciseById(e.exerciseId)?.muscle === 'Core');
  const hasCardio = () =>
    exercises.some((e) => getExerciseById(e.exerciseId)?.muscle === 'Cardio');

  // Prioridad: más abdominales.
  if (priorities.includes('Más abdominales') && tpl.key !== 'coreCardio' && !hasCore()) {
    const ex = pick(poolFor('core'), prefer, used);
    if (ex) add(ex);
  }

  // Prioridad: más pierna (en días de pierna o el día de core/cardio).
  if (
    priorities.includes('Más pierna') &&
    (tpl.key.startsWith('legs') || tpl.key === 'coreCardio' || tpl.key === 'lower')
  ) {
    const ex = pick([...poolFor('quad'), ...poolFor('posterior')], prefer, used);
    if (ex) add(ex);
  }

  // Cardio finisher: siempre en pérdida de grasa; opcional si se prioriza.
  const wantCardio =
    goal === 'Pérdida de grasa'
      ? tpl.key !== 'coreCardio'
      : priorities.includes('Más cardio');
  if (wantCardio && !hasCardio()) {
    const cardio = pickCardio(band, used);
    if (cardio) add(cardio, true);
  }

  return { key: tpl.key, name: tpl.name, focus: tpl.focus, exercises };
}

/**
 * Genera un plan semanal completo: el coach elige el split según los días,
 * ajusta series/reps/descanso por edad y objetivo, y añade cardio y accesorios.
 */
export function generatePlan(input: PlanInput): WeeklyPlan {
  const band = ageBand(input.age);
  const templates = splitFor(input.days);
  const days: PlanDay[] = templates.map((t, i) => {
    const d = buildDay(t, input.goal, band, input.priorities);
    return { ...d, name: `Día ${i + 1} · ${d.name}` };
  });
  return {
    title: `${input.goal} · ${input.days} días/sem`,
    summary: GOAL_PARAMS[input.goal].summary,
    ageNote: AGE_ADJ[band].note,
    goal: input.goal,
    days,
  };
}
