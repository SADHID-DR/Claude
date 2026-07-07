import { Wod } from '@/lib/types';

/**
 * WODs (Workout of the Day) de CrossFit para hacer dentro del gym.
 * Incluye benchmarks clásicos ("The Girls", héroes) y opciones para empezar.
 */
export const WODS: Wod[] = [
  {
    id: 'wod-fran',
    name: 'Fran',
    format: 'For Time',
    description:
      'El benchmark más famoso de CrossFit. Corto e intenso: pulmones a tope.',
    movements: ['21-15-9 reps de:', 'Thrusters 43/30 kg', 'Pull-ups'],
    scaling:
      'Baja el peso del thruster (20/15 kg) y usa pull-ups asistidos con banda o jalón.',
    benchmark: true,
  },
  {
    id: 'wod-cindy',
    name: 'Cindy',
    format: 'AMRAP',
    minutes: 20,
    description:
      'AMRAP de 20 min. Solo peso corporal, pero acumula muchísimo volumen.',
    movements: [
      'Tantas rondas como puedas en 20 min de:',
      '5 Pull-ups',
      '10 Flexiones',
      '15 Air squats',
    ],
    scaling:
      'Pull-ups con banda, flexiones de rodillas. Objetivo: mantener ritmo constante.',
    benchmark: true,
  },
  {
    id: 'wod-murph',
    name: 'Murph',
    format: 'For Time',
    description:
      'WOD héroe en honor al teniente Michael Murphy. Muy exigente y largo.',
    movements: [
      'Por tiempo:',
      '1,6 km carrera',
      '100 Pull-ups',
      '200 Flexiones',
      '300 Air squats',
      '1,6 km carrera',
      '(con chaleco de 9 kg en Rx)',
    ],
    scaling:
      'Sin chaleco y reparte las reps (ej. 20 rondas de 5-10-15). Reduce la carrera a 800 m.',
    benchmark: true,
  },
  {
    id: 'wod-helen',
    name: 'Helen',
    format: 'For Time',
    description: '3 rondas rápidas combinando carrera, kettlebell y dominadas.',
    movements: [
      '3 rondas por tiempo de:',
      '400 m carrera',
      '21 Kettlebell swings 24/16 kg',
      '12 Pull-ups',
    ],
    scaling: 'Kettlebell 12/8 kg y pull-ups asistidos. Reduce la carrera a 200 m.',
    benchmark: true,
  },
  {
    id: 'wod-annie',
    name: 'Annie',
    format: 'For Time',
    description: 'Dobles con cuerda y abdominales. Técnica de comba a prueba.',
    movements: [
      '50-40-30-20-10 reps de:',
      'Double unders',
      'Sit-ups (abdominales)',
    ],
    scaling: 'Cambia dobles por saltos simples x2 o x3.',
    benchmark: true,
  },
  {
    id: 'wod-grace',
    name: 'Grace',
    format: 'For Time',
    description: '30 clean & jerk por tiempo. Corto y potente.',
    movements: ['Por tiempo:', '30 Clean & jerk 61/43 kg'],
    scaling: 'Baja el peso a algo que puedas mover con buena técnica (30/20 kg).',
    benchmark: true,
  },
  {
    id: 'wod-emom-12',
    name: 'EMOM 12 — Fuerza y core',
    format: 'EMOM',
    minutes: 12,
    description:
      'Cada minuto, en el minuto. Descansas el tiempo que te sobre de cada minuto.',
    movements: [
      'Min 1, 4, 7, 10: 10 Kettlebell swings',
      'Min 2, 5, 8, 11: 8 Box jumps',
      'Min 3, 6, 9, 12: 12 Sit-ups',
    ],
    scaling: 'Reduce las reps para que te sobren ~20 s de descanso cada minuto.',
    benchmark: false,
  },
  {
    id: 'wod-death-by-burpees',
    name: 'Death by Burpees',
    format: 'EMOM',
    minutes: 20,
    description:
      'Escalera creciente: minuto 1 haces 1 burpee, minuto 2 haces 2… hasta que no llegues.',
    movements: [
      'Cada minuto suma un burpee más:',
      'Min 1: 1 burpee · Min 2: 2 burpees · …',
      'Continúa hasta que no completes las reps en el minuto.',
    ],
    scaling: 'Empieza en el minuto 1 con 1 rep; tu marca es el último minuto completado.',
    benchmark: false,
  },
  {
    id: 'wod-amrap-10-starter',
    name: 'AMRAP 10 — Para empezar',
    format: 'AMRAP',
    minutes: 10,
    description:
      'WOD sencillo y accesible para iniciarte en CrossFit dentro del gym.',
    movements: [
      'Tantas rondas como puedas en 10 min de:',
      '10 Air squats',
      '8 Flexiones (de rodillas si hace falta)',
      '6 Kettlebell swings ligeros',
    ],
    scaling: 'Ajusta las reps y el peso para mantener un ritmo cómodo y constante.',
    benchmark: false,
  },
];

export function getWodById(id: string): Wod | undefined {
  return WODS.find((w) => w.id === id);
}
