import { EXERCISES, getExerciseById } from '@/data/exercises';
import { Category, Exercise, RoutineExercise } from '@/lib/types';

export type Goal = 'Fuerza' | 'Hipertrofia' | 'Pérdida de grasa';
export type Priority = 'Más pierna' | 'Más abdominales' | 'Más cardio';

export const GOALS: Goal[] = ['Fuerza', 'Hipertrofia', 'Pérdida de grasa'];
export const PRIORITIES: Priority[] = ['Más pierna', 'Más abdominales', 'Más cardio'];
export const DAY_OPTIONS = [2, 3, 4, 5, 6];

// ───────────────────────── Nivel de experiencia ─────────────────────────
export type Level = 'Principiante' | 'Intermedio' | 'Avanzado';
export const LEVELS: Level[] = ['Principiante', 'Intermedio', 'Avanzado'];

// ─────────────── Molestias que el coach evita al elegir ejercicios ───────────────
export type Injury = 'Rodilla' | 'Hombro' | 'Zona lumbar';
export const INJURIES: Injury[] = ['Rodilla', 'Hombro', 'Zona lumbar'];

const INJURY_BLOCK: Record<Injury, RegExp> = {
  Rodilla: /sentadilla|zancada|búlgara|prensa|salto|box jump|extensión de cuádriceps|thruster|wall ball|subida/i,
  Hombro: /militar|press de hombro|arnold|push press|arrancada|snatch|fondos|elevaciones|mentón/i,
  'Zona lumbar': /peso muerto|buenos días|pendlay|remo con barra|swing|leñador|cargada|clean/i,
};

/** Quita del pool los ejercicios contraindicados y los que exceden el nivel. */
function filterConstraints(pool: Exercise[], level: Level, avoid: Injury[]): Exercise[] {
  let out = pool;
  if (level === 'Principiante') {
    const eased = out.filter((e) => e.difficulty !== 'Avanzado');
    if (eased.length > 0) out = eased;
  }
  for (const inj of avoid) {
    const safe = out.filter((e) => !INJURY_BLOCK[inj].test(e.name));
    if (safe.length > 0) out = safe;
  }
  return out;
}

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

export const EQUIPMENT = [
  'Barra',
  'Mancuernas',
  'Kettlebell',
  'Máquina',
  'Peso corporal',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/** Etiquetas de equipo que cubre un ejercicio (para filtrar por disponibilidad). */
function equipTags(ex: Exercise): Equipment[] {
  const eq = ex.equipment.toLowerCase();
  const tags: Equipment[] = [];
  if (eq.includes('barra') && !eq.includes('fija')) tags.push('Barra');
  if (eq.includes('mancuerna')) tags.push('Mancuernas');
  if (eq.includes('kettlebell')) tags.push('Kettlebell');
  if (ex.category === 'Máquina') tags.push('Máquina');
  if (
    ex.category === 'Peso corporal' ||
    eq.includes('peso corporal') ||
    eq.includes('ninguno') ||
    eq.includes('fija') ||
    eq.includes('comba') ||
    eq.includes('cajón') ||
    eq.includes('balón')
  ) {
    tags.push('Peso corporal');
  }
  return tags;
}

/** Filtra un pool por el equipo disponible; si queda vacío, no filtra (fallback). */
function filterEquip(pool: Exercise[], avail: Equipment[]): Exercise[] {
  if (!avail || avail.length === 0) return pool;
  const r = pool.filter((e) => equipTags(e).some((t) => avail.includes(t)));
  return r.length > 0 ? r : pool;
}

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

function pickCardio(band: AgeBand, used: Set<string>, avail: Equipment[]): Exercise | null {
  const ids = band === 'maduro' || band === 'senior' ? CARDIO_LOW : CARDIO_ALL;
  const pool = ids.map(getExerciseById).filter(Boolean) as Exercise[];
  return pick(filterEquip(pool, avail), ['Máquina', 'Peso corporal', 'CrossFit'], used);
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
const FULLBODY: DayTemplate = {
  key: 'full',
  name: 'Cuerpo completo',
  focus: 'Todo el cuerpo',
  slots: ['quad', 'chest', 'back', 'shoulders', 'posterior', 'biceps', 'triceps', 'core'],
};

function splitFor(days: number, fullBody: boolean): DayTemplate[] {
  if (fullBody) return Array.from({ length: days }, () => FULLBODY);
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

/** Duración objetivo del entrenamiento → nº de ejercicios por día. */
export const DURATIONS = [30, 45, 60, 75, 90] as const;
export type Duration = (typeof DURATIONS)[number];
const PER_DAY_BY_DURATION: Record<number, number> = {
  30: 3,
  45: 4,
  60: 5,
  75: 6,
  90: 7,
};

// ─────────────────────────────── Generación ──────────────────────────────────
import { Cycle } from '@/lib/types';

export type { Cycle } from '@/lib/types';
export const CYCLES: Cycle[] = ['Semanal', 'Bisemanal', 'Mensual'];
export const CYCLE_WEEKS: Record<Cycle, number> = {
  Semanal: 1,
  Bisemanal: 2,
  Mensual: 4,
};

export interface PlanInput {
  /** Nivel de experiencia (ajusta ejercicios y series). */
  level?: Level;
  /** Molestias: el coach evita ejercicios que las carguen. */
  avoid?: Injury[];
  days: number;
  goal: Goal;
  age: number;
  priorities: Priority[];
  cycle: Cycle;
  /** Equipo disponible; vacío = usa todo. */
  equipment?: Equipment[];
  /** Duración objetivo por sesión en minutos (ajusta nº de ejercicios). */
  duration?: number;
  /** Si es true, cada día es de cuerpo completo. */
  fullBody?: boolean;
}

export interface PlanDay {
  key: string;
  name: string;
  focus: string;
  exercises: RoutineExercise[];
}

export interface PlanWeek {
  index: number;
  label: string;
  /** Nota de progresión de la semana (o descarga). */
  note: string;
  days: PlanDay[];
}

export interface WeeklyPlan {
  title: string;
  summary: string;
  ageNote: string;
  goal: Goal;
  cycle: Cycle;
  weeks: PlanWeek[];
  /** Días de descanso a la semana. */
  restDays: number;
  /** Reparto sugerido de días de entrenamiento (L, M, X...). */
  schedule: string[];
  /** Calentamiento recomendado según la edad. */
  warmup: string;
}

const WARMUP_BY_BAND: Record<AgeBand, string> = {
  joven: '5 min de cardio suave + movilidad de las articulaciones que vas a trabajar.',
  adulto:
    '8 min: cardio suave, movilidad y 1–2 series de aproximación antes de los básicos.',
  maduro:
    '10 min: cardio suave, movilidad articular y series ligeras de aproximación. Sin prisa.',
  senior:
    '12–15 min: cardio muy suave, movilidad completa y aproximaciones graduales; cuida hombros, cadera y rodillas.',
};

/** Reparto de días de entrenamiento a lo largo de la semana. */
const SCHEDULE_BY_DAYS: Record<number, string[]> = {
  2: ['Lun', 'Jue'],
  3: ['Lun', 'Mié', 'Vie'],
  4: ['Lun', 'Mar', 'Jue', 'Vie'],
  5: ['Lun', 'Mar', 'Mié', 'Vie', 'Sáb'],
  6: ['Lun', 'Mar', 'Mié', 'Vie', 'Sáb', 'Dom'],
};

/** Ajuste de progresión aplicado a una semana concreta. */
interface WeekProg {
  repAdd: number;
  restAdd: number;
  setAdd: number;
}

function buildDay(
  tpl: DayTemplate,
  goal: Goal,
  band: AgeBand,
  priorities: Priority[],
  prog: WeekProg = { repAdd: 0, restAdd: 0, setAdd: 0 },
  avail: Equipment[] = [],
  perDay?: number,
  level: Level = 'Intermedio',
  avoid: Injury[] = []
): PlanDay {
  const gp = GOAL_PARAMS[goal];
  const adj = AGE_ADJ[band];
  const prefer: Category[] = adj.preferSafe
    ? ['Máquina', 'Peso corporal', 'Peso libre', 'CrossFit']
    : gp.prefer;
  const reps = gp.reps + adj.repAdd + prog.repAdd;
  const rest = Math.max(30, Math.round((gp.rest * adj.restMult) / 5) * 5 + prog.restAdd);
  const levelSetAdd = level === 'Principiante' ? -1 : level === 'Avanzado' ? 1 : 0;
  const sets = Math.min(6, Math.max(2, gp.sets + prog.setAdd + levelSetAdd));
  const used = new Set<string>();
  const exercises: RoutineExercise[] = [];

  // Pool de un slot ya filtrado por el equipo disponible.
  const P = (key: PoolKey) => filterConstraints(filterEquip(poolFor(key), avail), level, avoid);

  const perDayCount = perDay ?? gp.exercisesPerDay;
  const target = tpl.key === 'coreCardio' ? Math.max(4, perDayCount) : perDayCount;

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
    const ex = pick(P(slot), prefer, used);
    if (ex) add(ex, slot === 'cardio');
  }

  const hasCore = () =>
    exercises.some((e) => getExerciseById(e.exerciseId)?.muscle === 'Core');
  const hasCardio = () =>
    exercises.some((e) => getExerciseById(e.exerciseId)?.muscle === 'Cardio');

  // Prioridad: más abdominales.
  if (priorities.includes('Más abdominales') && tpl.key !== 'coreCardio' && !hasCore()) {
    const ex = pick(P('core'), prefer, used);
    if (ex) add(ex);
  }

  // Prioridad: más pierna (en días de pierna o el día de core/cardio).
  if (
    priorities.includes('Más pierna') &&
    (tpl.key.startsWith('legs') || tpl.key === 'coreCardio' || tpl.key === 'lower')
  ) {
    const ex = pick([...P('quad'), ...P('posterior')], prefer, used);
    if (ex) add(ex);
  }

  // Cardio finisher: siempre en pérdida de grasa; opcional si se prioriza.
  const wantCardio =
    goal === 'Pérdida de grasa'
      ? tpl.key !== 'coreCardio'
      : priorities.includes('Más cardio');
  if (wantCardio && !hasCardio()) {
    const cardio = pickCardio(band, used, avail);
    if (cardio) add(cardio, true);
  }

  // Orden de coach: músculos grandes primero, pequeños después, core/cardio al final.
  const MUSCLE_ORDER: Record<string, number> = {
    'Cuerpo completo': 0,
    Piernas: 1,
    Espalda: 2,
    Pecho: 3,
    Hombros: 4,
    Brazos: 5,
    Core: 6,
    Cardio: 7,
  };
  const ordered = exercises
    .map((e, i) => ({ e, i }))
    .sort((x, y) => {
      const mx = MUSCLE_ORDER[getExerciseById(x.e.exerciseId)?.muscle ?? ''] ?? 5;
      const my = MUSCLE_ORDER[getExerciseById(y.e.exerciseId)?.muscle ?? ''] ?? 5;
      return mx - my || x.i - y.i;
    })
    .map((x) => x.e);

  return { key: tpl.key, name: tpl.name, focus: tpl.focus, exercises: ordered };
}

/** Progresión de una semana según el objetivo y su posición en el ciclo. */
function weekProgression(
  goal: Goal,
  weekIdx: number,
  totalWeeks: number
): { prog: WeekProg; note: string } {
  const none = { repAdd: 0, restAdd: 0, setAdd: 0 };
  if (totalWeeks === 1) {
    return {
      prog: none,
      note: 'Plan de una semana. Sube peso cuando completes todas las series con buena técnica.',
    };
  }
  // Última semana del plan mensual: descarga (deload).
  if (totalWeeks === 4 && weekIdx === 3) {
    return {
      prog: { repAdd: 0, restAdd: 20, setAdd: -1 },
      note: 'Descarga: baja el volumen y prioriza recuperar para la siguiente etapa.',
    };
  }
  if (weekIdx === 0) {
    return { prog: none, note: 'Semana base: fija tu técnica y tus pesos de partida.' };
  }
  switch (goal) {
    case 'Hipertrofia':
      return {
        prog: { repAdd: weekIdx, restAdd: 0, setAdd: 0 },
        note: `Progresión: +${weekIdx} rep por serie sobre la base.`,
      };
    case 'Fuerza':
      return {
        prog: none,
        note: 'Progresión: sube ~2,5–5 % el peso respecto a la semana anterior.',
      };
    case 'Pérdida de grasa':
      return {
        prog: { repAdd: 0, restAdd: -5 * weekIdx, setAdd: 0 },
        note: `Progresión: −${5 * weekIdx} s de descanso para más densidad.`,
      };
  }
}

/**
 * Genera un plan completo (semanal / bisemanal / mensual): el coach elige el
 * split según los días, ajusta series/reps/descanso por edad y objetivo, añade
 * cardio y accesorios, y aplica progresión (y descarga) entre semanas.
 */
export function generatePlan(input: PlanInput): WeeklyPlan {
  const band = ageBand(input.age);
  const templates = splitFor(input.days, input.fullBody ?? false);
  const totalWeeks = CYCLE_WEEKS[input.cycle];
  const perDay = input.duration
    ? PER_DAY_BY_DURATION[input.duration]
    : GOAL_PARAMS[input.goal].exercisesPerDay;

  const weeks: PlanWeek[] = [];
  for (let w = 0; w < totalWeeks; w++) {
    const { prog, note } = weekProgression(input.goal, w, totalWeeks);
    const days: PlanDay[] = templates.map((t, i) => {
      const d = buildDay(t, input.goal, band, input.priorities, prog, input.equipment ?? [], perDay, input.level ?? 'Intermedio', input.avoid ?? []);
      return { ...d, name: `Día ${i + 1} · ${d.name}` };
    });
    weeks.push({ index: w, label: `Semana ${w + 1}`, note, days });
  }

  return {
    title: `${input.goal} · ${input.days} días/sem`,
    summary: GOAL_PARAMS[input.goal].summary,
    ageNote: AGE_ADJ[band].note,
    goal: input.goal,
    cycle: input.cycle,
    weeks,
    restDays: 7 - input.days,
    schedule: SCHEDULE_BY_DAYS[input.days] ?? [],
    warmup: WARMUP_BY_BAND[band],
  };
}
