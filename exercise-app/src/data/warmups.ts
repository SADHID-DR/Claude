import { Routine } from '@/lib/types';
import { getExerciseById } from '@/data/exercises';

/**
 * Biblioteca de calentamiento (≤15 min): elevar pulso + movilidad y
 * activación con peso corporal o carga ligera, estilo Home Workout.
 * `exerciseId` enlaza con el catálogo cuando existe, para abrir la
 * demostración animada de la técnica.
 */
export interface WarmupItem {
  id: string;
  name: string;
  /** Prescripción legible: "5 min", "30 s/lado", "3×10"… */
  dose: string;
  kind: 'pulso' | 'movilidad' | 'activación' | 'potencia';
  /** Ejercicio del catálogo equivalente (para ver la técnica). */
  exerciseId?: string;
}

export const WARMUPS: WarmupItem[] = [
  // ── Elevar pulso ──
  { id: 'wu-stair', name: 'Escaladora', dose: '5 min', kind: 'pulso', exerciseId: 'ex-stair-climber' },
  { id: 'wu-bike', name: 'Bici estática', dose: '5 min', kind: 'pulso', exerciseId: 'ex-bike' },
  { id: 'wu-row', name: 'Remo en ergómetro', dose: '4 min', kind: 'pulso', exerciseId: 'ex-rowing' },
  { id: 'wu-jumprope', name: 'Saltar la cuerda', dose: '3 min', kind: 'pulso', exerciseId: 'ex-jump-rope' },
  // ── Movilidad (peso corporal) ──
  { id: 'wu-firehydrant', name: 'Fire hydrant (perro al hidrante)', dose: '30 s/lado', kind: 'movilidad' },
  { id: 'wu-kickback', name: 'Patada de glúteo en cuadrupedia', dose: '30 s/lado', kind: 'movilidad' },
  { id: 'wu-birddog', name: 'Bird-dog', dose: '10/lado', kind: 'movilidad', exerciseId: 'ex-bird-dog' },
  { id: 'wu-catcow', name: 'Gato-camello', dose: '10 reps', kind: 'movilidad' },
  { id: 'wu-hipcircle', name: 'Círculos de cadera', dose: '10/lado', kind: 'movilidad' },
  { id: 'wu-legswing', name: 'Balanceos de pierna', dose: '10/lado', kind: 'movilidad' },
  { id: 'wu-ankle', name: 'Movilidad de tobillo contra pared', dose: '10/lado', kind: 'movilidad' },
  { id: 'wu-wgs', name: "World's greatest stretch", dose: '5/lado', kind: 'movilidad' },
  { id: 'wu-disloc', name: 'Dislocaciones de hombro (banda/palo)', dose: '15 reps', kind: 'movilidad' },
  { id: 'wu-shoulderrot', name: 'Rotaciones externas con banda', dose: '12/lado', kind: 'movilidad' },
  // ── Activación (ligero) ──
  { id: 'wu-glutebridge', name: 'Puente de glúteo', dose: '15 reps', kind: 'activación', exerciseId: 'ex-db-glute-bridge' },
  { id: 'wu-pullapart', name: 'Band pull-aparts', dose: '15 reps', kind: 'activación' },
  { id: 'wu-facepull', name: 'Face pull ligero', dose: '15 reps', kind: 'activación', exerciseId: 'ex-face-pull' },
  { id: 'wu-scap', name: 'Encogimientos de escápula colgado', dose: '10 reps', kind: 'activación' },
  { id: 'wu-goblet', name: 'Sentadilla goblet ligera', dose: '10 reps', kind: 'activación', exerciseId: 'ex-goblet-squat' },
  { id: 'wu-rdl', name: 'Peso muerto rumano ligero', dose: '10 reps', kind: 'activación', exerciseId: 'ex-db-rdl' },
  { id: 'wu-lungetwist', name: 'Zancada con giro', dose: '5/lado', kind: 'activación' },
  { id: 'wu-airsquat', name: 'Air squat', dose: '15 reps', kind: 'activación', exerciseId: 'ex-air-squat' },
  { id: 'wu-pushup', name: 'Flexiones fáciles', dose: '10 reps', kind: 'activación', exerciseId: 'ex-pushup' },
  // ── Potencia (tu circuito por defecto) ──
  { id: 'wu-boxjump', name: 'Salto de caja 24"', dose: '3×10', kind: 'potencia', exerciseId: 'ex-box-jump' },
  { id: 'wu-kipping', name: 'Kipping en barra', dose: '3×10', kind: 'potencia', exerciseId: 'ex-pullup' },
];

const byId = (id: string) => WARMUPS.find((w) => w.id === id)!;

/** Tu circuito por defecto (días que NO son de pierna). */
export const DEFAULT_WARMUP = ['wu-stair', 'wu-boxjump', 'wu-kipping'];

/** ¿La rutina es un día de pierna? (nombre o mayoría de ejercicios). */
export function isLegDay(routine: Routine): boolean {
  const n = routine.name.toLowerCase();
  if (/pierna|inferior|cu[aá]driceps|posterior|glúteo/.test(n)) return true;
  const legs = routine.exercises.filter(
    (re) => getExerciseById(re.exerciseId)?.muscle === 'Piernas'
  ).length;
  return legs >= Math.max(2, Math.ceil(routine.exercises.length / 2));
}

/**
 * Recomendación del coach según el día (≤15 min):
 * pierna → cadera/tobillo + activación específica; empuje → hombro;
 * tirón → escápula/dorsal; resto → tu circuito por defecto + movilidad.
 */
export function recommendedWarmup(routine: Routine): WarmupItem[] {
  const n = routine.name.toLowerCase();
  if (isLegDay(routine)) {
    return ['wu-bike', 'wu-hipcircle', 'wu-ankle', 'wu-goblet', 'wu-rdl', 'wu-glutebridge'].map(byId);
  }
  if (/empuje|pecho|hombro|push|superior/.test(n)) {
    return [...DEFAULT_WARMUP, 'wu-disloc', 'wu-shoulderrot'].map(byId);
  }
  if (/tir[oó]n|espalda|pull/.test(n)) {
    return [...DEFAULT_WARMUP, 'wu-pullapart', 'wu-scap'].map(byId);
  }
  if (/crossfit|wod/.test(n)) {
    return [...DEFAULT_WARMUP, 'wu-wgs', 'wu-airsquat'].map(byId);
  }
  return [...DEFAULT_WARMUP, 'wu-wgs'].map(byId);
}
