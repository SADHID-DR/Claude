import { Plan } from '@/lib/types';

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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface TodayInfo {
  isTrainingDay: boolean;
  /** Semana actual del ciclo (0..weeks-1). */
  weekIndex: number;
  routineId?: string;
  dayLabel?: string;
}

/**
 * Calcula qué toca hoy según el plan activo: en qué semana del ciclo estás y,
 * si hoy es día de entrenamiento, qué rutina corresponde.
 */
export function planToday(plan: Plan, now = new Date()): TodayInfo {
  const weeksElapsed = Math.floor((now.getTime() - plan.createdAt) / WEEK_MS);
  const weeks = Math.max(1, plan.weeks);
  const weekIndex = ((weeksElapsed % weeks) + weeks) % weeks;

  const dow = now.getDay();
  const pos = plan.schedule.findIndex((lbl) => LABEL_TO_DOW[lbl] === dow);
  if (pos < 0) return { isTrainingDay: false, weekIndex };

  const idx = weekIndex * plan.days + pos;
  return {
    isTrainingDay: true,
    weekIndex,
    routineId: plan.routineIds[idx],
    dayLabel: plan.schedule[pos],
  };
}
