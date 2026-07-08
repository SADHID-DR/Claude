import { Plan, WorkoutSession } from '@/lib/types';

/** Etiqueta de día → índice de getDay() (0 = domingo). */
const LABEL_TO_DOW: Record<string, number> = {
  Dom: 0,
  Lun: 1,
  Mar: 2,
  Mié: 3,
  Jue: 4,
  Vie: 5,
  Sáb: 6,
};

export interface TodayInfo {
  isTrainingDay: boolean;
  /** Semana actual del ciclo (0..weeks-1). */
  weekIndex: number;
  routineId?: string;
  dayLabel?: string;
  /** Entrenos del plan completados dentro del ciclo actual. */
  completedInCycle: number;
  /** Total de entrenos del ciclo (weeks × días). */
  cycleTotal: number;
  /** Si el entreno de hoy ya está hecho. */
  doneToday: boolean;
}

/** Nº de rutinas distintas del plan ya entrenadas (en toda la historia). */
function completedRoutineIds(plan: Plan, sessions: WorkoutSession[]): Set<string> {
  const ids = new Set(plan.routineIds);
  const done = new Set<string>();
  for (const s of sessions) {
    if (s.routineId && ids.has(s.routineId)) done.add(s.routineId);
  }
  return done;
}

/**
 * Calcula qué toca hoy según el plan activo. La SEMANA avanza a medida que
 * completas entrenos (cada bloque de "días" completados = una semana), y el
 * DÍA concreto se elige según el día de la semana del calendario.
 */
export function planToday(
  plan: Plan,
  sessions: WorkoutSession[],
  now = new Date()
): TodayInfo {
  const cycleTotal = Math.max(1, plan.weeks * plan.days);
  const done = completedRoutineIds(plan, sessions);
  const completedInCycle = done.size % cycleTotal;
  const weekIndex = Math.floor(completedInCycle / plan.days) % Math.max(1, plan.weeks);

  const dow = now.getDay();
  const pos = plan.schedule.findIndex((lbl) => LABEL_TO_DOW[lbl] === dow);
  if (pos < 0) {
    return {
      isTrainingDay: false,
      weekIndex,
      completedInCycle,
      cycleTotal,
      doneToday: false,
    };
  }

  const routineId = plan.routineIds[weekIndex * plan.days + pos];
  return {
    isTrainingDay: true,
    weekIndex,
    routineId,
    dayLabel: plan.schedule[pos],
    completedInCycle,
    cycleTotal,
    doneToday: routineId ? done.has(routineId) : false,
  };
}
