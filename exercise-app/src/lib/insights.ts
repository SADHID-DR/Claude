import { WorkoutSession } from '@/lib/types';
import { getExerciseById } from '@/data/exercises';
import { epley1RM } from '@/lib/strength';
import { sessionVolume } from '@/lib/stats';
import { WeightUnit, fmtWeight, roundLoad, toDisplay } from '@/lib/units';

/**
 * Motor de "ajustes inteligentes": lee tu historial en el propio teléfono
 * (sin internet ni servicios externos) y devuelve recomendaciones de coach
 * accionables — subir peso, descargar, retomar el ritmo, músculo olvidado…
 */
export interface Insight {
  id: string;
  emoji: string;
  title: string;
  body: string;
  tone: 'good' | 'warn' | 'info';
}

const DAY = 86400000;
const MAJOR = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'];

/** Lunes 00:00 de la semana de una fecha. */
function weekStart(ts: number): number {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

/** Serie cronológica de 1RM estimado por ejercicio (una por sesión). */
function e1rmByExercise(sessions: WorkoutSession[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  // sessions viene de más reciente a más antigua → recorrer al revés.
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    const bestPerEx: Record<string, number> = {};
    s.sets.forEach((set) => {
      const e = epley1RM(set.weight, set.reps);
      if (e == null) return;
      bestPerEx[set.exerciseId] = Math.max(bestPerEx[set.exerciseId] ?? 0, e);
    });
    Object.entries(bestPerEx).forEach(([id, e]) => {
      (out[id] = out[id] ?? []).push(e);
    });
  }
  return out;
}

/**
 * Genera las recomendaciones. `weeklyGoal` viene del plan activo (o 4).
 * Devuelve como mucho 4, priorizando lo accionable.
 */
export function computeInsights(
  sessions: WorkoutSession[],
  weeklyGoal: number,
  unit: WeightUnit
): Insight[] {
  const warns: Insight[] = [];
  const goods: Insight[] = [];
  const infos: Insight[] = [];
  if (sessions.length === 0) return [];

  const now = Date.now();
  const daysSinceLast = Math.floor((now - sessions[0].date) / DAY);

  // ── Frecuencia ────────────────────────────────────────────────
  const thisWeek = weekStart(now);
  const lastWeek = thisWeek - 7 * DAY;
  const daysThisWeek = new Set(
    sessions.filter((s) => s.date >= thisWeek).map((s) => new Date(s.date).getDate())
  ).size;
  if (daysSinceLast >= 4) {
    warns.push({
      id: 'inactivo',
      emoji: '😴',
      title: `${daysSinceLast} días sin entrenar`,
      body: 'Retoma con una sesión suave; la constancia pesa más que la intensidad puntual.',
      tone: 'warn',
    });
  } else if (daysThisWeek >= weeklyGoal) {
    goods.push({
      id: 'meta',
      emoji: '🔥',
      title: 'Meta semanal cumplida',
      body: `${daysThisWeek}/${weeklyGoal} entrenos esta semana. ¡Sigue así!`,
      tone: 'good',
    });
  }

  // ── Progresión / estancamiento por ejercicio ──────────────────
  const series = e1rmByExercise(sessions);
  let progressPick: Insight | null = null;
  let stallPick: Insight | null = null;
  let progressN = 0;
  let stallN = 0;
  Object.entries(series).forEach(([id, arr]) => {
    if (arr.length < 3) return;
    const [x, y, z] = arr.slice(-3);
    const name = getExerciseById(id)?.name ?? 'un ejercicio';
    if (z > y && y > x) {
      progressN += 1;
      if (!progressPick || arr.length > progressN) {
        const next = roundLoad(toDisplay(z * 1.03, unit), unit);
        progressPick = {
          id: `prog-${id}`,
          emoji: '🔼',
          title: `Vas subiendo en ${name}`,
          body: `3 sesiones al alza. Prueba ${next} ${unit} en la próxima serie top.`,
          tone: 'good',
        };
      }
    } else if (z <= Math.max(x, y)) {
      stallN += 1;
      if (!stallPick) {
        stallPick = {
          id: `stall-${id}`,
          emoji: '🔁',
          title: `Estancado en ${name}`,
          body: `Sin progreso en 3 sesiones. Haz una semana de descarga (−10 %) o baja las reps 1–2 y aprieta la técnica.`,
          tone: 'warn',
        };
      }
    }
  });
  if (stallPick) warns.push(stallPick);
  if (progressPick) goods.push(progressPick);

  // ── Músculo olvidado (últimos 14 días) ────────────────────────
  const since14 = now - 14 * DAY;
  const muscleSets: Record<string, number> = {};
  let totalRecent = 0;
  sessions
    .filter((s) => s.date >= since14)
    .forEach((s) =>
      s.sets.forEach((set) => {
        const m = getExerciseById(set.exerciseId)?.muscle;
        if (!m || m === 'Cardio') return;
        muscleSets[m] = (muscleSets[m] ?? 0) + 1;
        totalRecent += 1;
      })
    );
  if (totalRecent >= 8) {
    const forgotten = MAJOR.filter((m) => (muscleSets[m] ?? 0) === 0);
    if (forgotten.length > 0) {
      warns.push({
        id: 'olvidado',
        emoji: '⚠️',
        title: `Tienes ${forgotten.join(' y ').toLowerCase()} abandonado`,
        body: 'Sin series en 2 semanas. Añade un día o cambia un ejercicio para equilibrar.',
        tone: 'warn',
      });
    }
  }

  // ── Tendencia de volumen (semana vs anterior) ─────────────────
  const volThis = sessions
    .filter((s) => s.date >= thisWeek)
    .reduce((sum, s) => sum + sessionVolume(s), 0);
  const volLast = sessions
    .filter((s) => s.date >= lastWeek && s.date < thisWeek)
    .reduce((sum, s) => sum + sessionVolume(s), 0);
  if (volLast > 0 && volThis > volLast * 1.1) {
    const pct = Math.round((volThis / volLast - 1) * 100);
    infos.push({
      id: 'volumen',
      emoji: '📈',
      title: `Volumen +${pct}% esta semana`,
      body: `Estás moviendo más carga total (${fmtWeight(volThis, unit)}) que la semana pasada.`,
      tone: 'info',
    });
  }

  // Prioriza avisos accionables, luego buenas noticias, luego info.
  return [...warns, ...goods, ...infos].slice(0, 4);
}
