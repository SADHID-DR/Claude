import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { Exercise } from '@/lib/types';
import { colors, muscleColors } from '@/lib/theme';

/**
 * Demostración animada del ejercicio: figura articulada en vista lateral
 * que interpola entre la pose inicial y final del movimiento, con el
 * equipo dibujado en la mano (disco de barra, mancuerna, kettlebell) o
 * el cable de la polea. Todo SVG: ligero, offline y fluido.
 */

type XY = [number, number];

/** Articulaciones de la figura (vista lateral, mirando a la derecha). */
interface Pose {
  hd: XY; // cabeza (centro)
  s: XY; // hombro
  h: XY; // cadera
  k1: XY; // rodilla delantera
  a1: XY; // tobillo delantero
  k2: XY; // rodilla trasera
  a2: XY; // tobillo trasero
  e: XY; // codo
  w: XY; // muñeca / mano
}

interface Pattern {
  a: Pose;
  b: Pose;
  ms?: number; // duración de cada fase (por defecto 950 ms)
  cable?: XY; // anclaje de polea → dibuja cable hasta la mano
  bar?: { x1: number; x2: number; y: number }; // barra fija (dominadas)
  bench?: { x: number; y: number; w: number }; // banco
  weightAt?: 'hip'; // el peso se apoya en la cadera (hip thrust)
  noWeight?: boolean; // manos ocupadas en barra/suelo: no dibujar peso
}

const STAND: Pose = {
  hd: [50, 20],
  s: [50, 30],
  h: [50, 56],
  k1: [51, 73],
  a1: [50, 90],
  k2: [49, 73],
  a2: [48, 90],
  e: [51, 43],
  w: [52, 55],
};

const HINGE_BOTTOM: Pose = {
  hd: [36, 44],
  s: [39, 52],
  h: [47, 67],
  k1: [53, 77],
  a1: [50, 90],
  k2: [51, 78],
  a2: [48, 90],
  e: [42, 63],
  w: [44, 75],
};

const ROW_BODY: Pose = {
  hd: [36, 42],
  s: [39, 50],
  h: [47, 64],
  k1: [53, 77],
  a1: [50, 90],
  k2: [51, 78],
  a2: [48, 90],
  e: [42, 62],
  w: [43, 74],
};

const PUSHUP_TOP: Pose = {
  hd: [28, 56],
  s: [35, 62],
  h: [54, 70],
  k1: [64, 76],
  a1: [76, 86],
  k2: [65, 77],
  a2: [77, 87],
  e: [34, 76],
  w: [34, 90],
};

const BENCH_BODY = {
  hd: [22, 68] as XY,
  s: [30, 70] as XY,
  h: [50, 71] as XY,
  k1: [62, 62] as XY,
  a1: [68, 88] as XY,
  k2: [63, 64] as XY,
  a2: [69, 89] as XY,
};

const SEAT_BODY = {
  hd: [47, 30] as XY,
  s: [48, 40] as XY,
  h: [48, 66] as XY,
  k1: [60, 68] as XY,
  a1: [62, 86] as XY,
  k2: [58, 68] as XY,
  a2: [60, 86] as XY,
};

const HANG: Pose = {
  hd: [51, 25],
  s: [52, 32],
  h: [50, 58],
  k1: [46, 71],
  a1: [48, 83],
  k2: [45, 72],
  a2: [47, 84],
  e: [54, 21],
  w: [55, 10],
};

const PATTERNS: Record<string, Pattern> = {
  squat: {
    a: { ...STAND, e: [55, 40], w: [58, 36] },
    b: {
      hd: [46, 36], s: [46, 46], h: [43, 68],
      k1: [56, 72], a1: [50, 90], k2: [54, 74], a2: [48, 90],
      e: [52, 54], w: [56, 50],
    },
  },
  hinge: {
    a: { ...STAND, e: [52, 44], w: [53, 57] },
    b: HINGE_BOTTOM,
  },
  swing: {
    a: { ...HINGE_BOTTOM, e: [44, 60], w: [41, 70] },
    b: { ...STAND, e: [59, 33], w: [68, 34] },
    ms: 750,
  },
  lunge: {
    a: STAND,
    b: {
      hd: [47, 30], s: [47, 40], h: [45, 64],
      k1: [57, 76], a1: [57, 90], k2: [37, 80], a2: [31, 90],
      e: [48, 52], w: [49, 63],
    },
  },
  ohp: {
    a: { ...STAND, e: [56, 38], w: [56, 29] },
    b: { ...STAND, e: [53, 18], w: [53, 8] },
  },
  frenchpress: {
    a: { ...STAND, e: [53, 22], w: [43, 30] },
    b: { ...STAND, e: [53, 20], w: [54, 9] },
  },
  curl: {
    a: { ...STAND, e: [52, 46], w: [53, 58] },
    b: { ...STAND, e: [52, 46], w: [44, 37] },
  },
  pushdown: {
    a: { ...STAND, e: [53, 46], w: [55, 33] },
    b: { ...STAND, e: [53, 46], w: [57, 60] },
    cable: [57, 2],
  },
  lateral: {
    a: { ...STAND, e: [52, 44], w: [53, 56] },
    b: { ...STAND, e: [62, 35], w: [73, 31] },
  },
  shrug: {
    a: { ...STAND, e: [51, 43], w: [52, 56] },
    b: { ...STAND, hd: [50, 16], s: [50, 26], e: [51, 39], w: [52, 52] },
    ms: 650,
  },
  calf: {
    a: STAND,
    b: {
      hd: [50, 15], s: [50, 25], h: [50, 51],
      k1: [51, 68], a1: [50, 85], k2: [49, 68], a2: [48, 85],
      e: [51, 38], w: [52, 50],
    },
    ms: 700,
  },
  thruster: {
    a: {
      hd: [46, 36], s: [46, 46], h: [43, 68],
      k1: [56, 72], a1: [50, 90], k2: [54, 74], a2: [48, 90],
      e: [50, 54], w: [54, 47],
    },
    b: { ...STAND, e: [52, 19], w: [53, 8] },
    ms: 800,
  },
  chop: {
    a: { ...STAND, e: [58, 26], w: [66, 18] },
    b: {
      hd: [46, 34], s: [46, 44], h: [44, 66],
      k1: [55, 72], a1: [50, 90], k2: [53, 73], a2: [48, 90],
      e: [42, 54], w: [36, 64],
    },
  },
  row: {
    a: ROW_BODY,
    b: { ...ROW_BODY, e: [46, 55], w: [43, 61] },
    ms: 800,
  },
  kickback: {
    a: { ...ROW_BODY, e: [45, 58], w: [43, 68] },
    b: { ...ROW_BODY, e: [45, 58], w: [57, 56] },
    ms: 750,
  },
  seatedrow: {
    a: {
      hd: [42, 30], s: [43, 40], h: [44, 66],
      k1: [58, 62], a1: [70, 74], k2: [58, 64], a2: [70, 76],
      e: [52, 46], w: [62, 48],
    },
    b: {
      hd: [42, 30], s: [43, 40], h: [44, 66],
      k1: [58, 62], a1: [70, 74], k2: [58, 64], a2: [70, 76],
      e: [48, 50], w: [50, 48],
    },
    cable: [93, 48],
    ms: 800,
  },
  pulldown: {
    a: { ...SEAT_BODY, e: [54, 26], w: [57, 12] },
    b: { ...SEAT_BODY, e: [55, 42], w: [56, 32] },
    cable: [58, 2],
    bench: { x: 40, y: 70, w: 16 },
  },
  pullup: {
    a: HANG,
    b: {
      hd: [50, 11], s: [52, 18], h: [50, 44],
      k1: [44, 57], a1: [46, 69], k2: [43, 58], a2: [45, 70],
      e: [59, 14], w: [55, 10],
    },
    bar: { x1: 32, x2: 72, y: 10 },
    noWeight: true,
  },
  hangraise: {
    a: HANG,
    b: {
      ...HANG,
      h: [48, 50], k1: [58, 40], a1: [62, 26], k2: [57, 42], a2: [61, 28],
    },
    bar: { x1: 32, x2: 72, y: 10 },
    noWeight: true,
  },
  dip: {
    a: {
      hd: [49, 42], s: [50, 49], h: [49, 68],
      k1: [44, 79], a1: [47, 86], k2: [43, 80], a2: [46, 87],
      e: [58, 57], w: [58, 50],
    },
    b: {
      hd: [50, 30], s: [51, 37], h: [50, 56],
      k1: [45, 67], a1: [48, 76], k2: [44, 68], a2: [47, 77],
      e: [56, 43], w: [58, 50],
    },
    bar: { x1: 50, x2: 68, y: 50 },
    noWeight: true,
  },
  bench: {
    a: { ...BENCH_BODY, e: [26, 80], w: [32, 62] },
    b: { ...BENCH_BODY, e: [32, 56], w: [33, 46] },
    bench: { x: 16, y: 74, w: 48 },
  },
  pullover: {
    a: { ...BENCH_BODY, e: [32, 56], w: [33, 46] },
    b: { ...BENCH_BODY, e: [22, 58], w: [14, 54] },
    bench: { x: 16, y: 74, w: 48 },
  },
  hipthrust: {
    a: {
      hd: [19, 54], s: [26, 60], h: [45, 80],
      k1: [59, 68], a1: [61, 88], k2: [60, 70], a2: [62, 89],
      e: [34, 68], w: [42, 74],
    },
    b: {
      hd: [18, 52], s: [26, 58], h: [48, 60],
      k1: [60, 64], a1: [61, 88], k2: [61, 66], a2: [62, 89],
      e: [35, 60], w: [44, 62],
    },
    bench: { x: 12, y: 62, w: 20 },
    weightAt: 'hip',
  },
  legext: {
    a: { ...SEAT_BODY, hd: [45, 32], s: [46, 42], k1: [61, 68], a1: [60, 86], k2: [60, 69], a2: [59, 87], e: [50, 52], w: [53, 62] },
    b: { ...SEAT_BODY, hd: [45, 32], s: [46, 42], k1: [61, 68], a1: [76, 66], k2: [60, 69], a2: [75, 68], e: [50, 52], w: [53, 62] },
    bench: { x: 38, y: 70, w: 18 },
    noWeight: true,
  },
  legcurl: {
    a: {
      hd: [24, 66], s: [32, 70], h: [52, 72],
      k1: [64, 73], a1: [78, 86], k2: [65, 74], a2: [79, 87],
      e: [28, 78], w: [24, 84],
    },
    b: {
      hd: [24, 66], s: [32, 70], h: [52, 72],
      k1: [64, 73], a1: [64, 50], k2: [65, 74], a2: [65, 52],
      e: [28, 78], w: [24, 84],
    },
    bench: { x: 26, y: 74, w: 40 },
    noWeight: true,
  },
  crunch: {
    a: {
      hd: [22, 80], s: [30, 84], h: [46, 84],
      k1: [58, 70], a1: [64, 86], k2: [59, 71], a2: [65, 87],
      e: [26, 74], w: [22, 76],
    },
    b: {
      hd: [30, 68], s: [36, 76], h: [46, 84],
      k1: [58, 70], a1: [64, 86], k2: [59, 71], a2: [65, 87],
      e: [32, 64], w: [27, 66],
    },
    noWeight: true,
    ms: 800,
  },
  plank: {
    a: {
      hd: [27, 60], s: [34, 66], h: [54, 72],
      k1: [64, 77], a1: [76, 86], k2: [65, 78], a2: [77, 87],
      e: [32, 80], w: [26, 90],
    },
    b: {
      hd: [27, 58], s: [34, 64], h: [54, 69],
      k1: [64, 76], a1: [76, 86], k2: [65, 77], a2: [77, 87],
      e: [32, 80], w: [26, 90],
    },
    noWeight: true,
    ms: 1400,
  },
  pushup: {
    a: PUSHUP_TOP,
    b: {
      hd: [24, 72], s: [33, 76], h: [54, 80],
      k1: [64, 82], a1: [76, 88], k2: [65, 83], a2: [77, 89],
      e: [22, 82], w: [34, 90],
    },
    noWeight: true,
  },
  mclimber: {
    a: { ...PUSHUP_TOP, k1: [48, 74], a1: [52, 84], k2: [68, 80], a2: [78, 88] },
    b: { ...PUSHUP_TOP, k1: [66, 78], a1: [76, 86], k2: [50, 76], a2: [52, 86] },
    noWeight: true,
    ms: 450,
  },
  run: {
    a: {
      hd: [52, 18], s: [52, 28], h: [49, 54],
      k1: [60, 64], a1: [57, 79], k2: [41, 68], a2: [33, 81],
      e: [59, 36], w: [65, 43],
    },
    b: {
      hd: [52, 18], s: [52, 28], h: [49, 54],
      k1: [42, 66], a1: [34, 80], k2: [59, 66], a2: [61, 80],
      e: [45, 38], w: [39, 46],
    },
    noWeight: true,
    ms: 450,
  },
  upright: {
    a: { ...STAND, e: [52, 44], w: [53, 57] },
    b: { ...STAND, e: [60, 36], w: [54, 32] },
    ms: 800,
  },
  backext: {
    a: {
      hd: [28, 84], s: [34, 76], h: [50, 68],
      k1: [62, 70], a1: [74, 72], k2: [63, 71], a2: [75, 73],
      e: [30, 82], w: [26, 86],
    },
    b: {
      hd: [18, 60], s: [26, 64], h: [50, 68],
      k1: [62, 70], a1: [74, 72], k2: [63, 71], a2: [75, 73],
      e: [24, 70], w: [20, 74],
    },
    bench: { x: 42, y: 70, w: 26 },
    noWeight: true,
  },
  carry: {
    a: {
      hd: [50, 19], s: [50, 29], h: [49, 55],
      k1: [58, 66], a1: [56, 80], k2: [42, 69], a2: [36, 82],
      e: [51, 42], w: [52, 55],
    },
    b: {
      hd: [50, 19], s: [50, 29], h: [49, 55],
      k1: [43, 67], a1: [37, 81], k2: [57, 67], a2: [58, 81],
      e: [51, 42], w: [52, 55],
    },
    ms: 500,
  },
  burpee: {
    a: PUSHUP_TOP,
    b: {
      hd: [50, 14], s: [50, 24], h: [50, 52],
      k1: [51, 70], a1: [50, 88], k2: [49, 71], a2: [48, 89],
      e: [53, 14], w: [54, 6],
    },
    noWeight: true,
    ms: 800,
  },
};

/** Reglas por nombre (en orden: la primera que casa gana). */
const RULES: [RegExp, string][] = [
  [/bicicleta abdominal/, 'crunch'],
  [/hollow|dead bug|v-up|v up/, 'crunch'],
  [/bird.?dog/, 'plank'],
  [/superman/, 'backext'],
  [/molino|slam|battle|olas con cuerda/, 'chop'],
  [/trineo/, 'carry'],
  [/muscle.?up/, 'pullup'],
  [/pino|hspu|wall walk/, 'ohp'],
  [/man maker|bear|complejo de oso/, 'thruster'],
  [/devil/, 'thruster'],
  [/tirón alto/, 'upright'],
  [/pull.?through/, 'swing'],
  [/contractora/, 'bench'],
  [/deltoide posterior/, 'kickback'],
  [/cruce de poleas|crossover/, 'chop'],
  [/aductor/, 'legext'],
  [/hack/, 'squat'],
  [/búlgara|zancada|subida al cajón|lunge/, 'lunge'],
  [/sentadilla|air squat|prensa de pierna|goblet|wall sit/, 'squat'],
  [/curl femoral/, 'legcurl'],
  [/extensión de cuádriceps/, 'legext'],
  [/peso muerto|buenos días|rumano|rack pull/, 'hinge'],
  [/swing/, 'swing'],
  [/hip thrust|puente de glúteo|puente/, 'hipthrust'],
  [/gemelo|talones|pantorrilla/, 'calf'],
  [/flexiones|push.?up/, 'pushup'],
  [/fondos/, 'dip'],
  [/pullover/, 'pullover'],
  [/press de banca|press banca|press inclinado|press declinado|floor press|press de pecho|aperturas|cruce/, 'bench'],
  [/press militar|press de hombro|arnold|push press/, 'ohp'],
  [/elevaciones? lateral|elevaciones? frontal/, 'lateral'],
  [/pájaro/, 'kickback'],
  [/encogimiento/, 'shrug'],
  [/face pull/, 'seatedrow'],
  [/renegado/, 'plank'],
  [/remo al mentón/, 'upright'],
  [/remo en ergómetro|remo sentado/, 'seatedrow'],
  [/remo/, 'row'],
  [/jalón/, 'pulldown'],
  [/dominada|pull.?up/, 'pullup'],
  [/toes to bar|piernas colgado/, 'hangraise'],
  [/patada de tríceps/, 'kickback'],
  [/francés|tríceps sobre la cabeza|tríceps tumbado|halo/, 'frenchpress'],
  [/tríceps en polea|pushdown|extensión de tríceps/, 'pushdown'],
  [/curl/, 'curl'],
  [/plancha/, 'plank'],
  [/crunch|abdominal|giro ruso/, 'crunch'],
  [/mountain climber|escalador/, 'mclimber'],
  [/burpee/, 'burpee'],
  [/thruster|wall ball|cargada|clean|snatch|arrancada|turkish/, 'thruster'],
  [/leñador/, 'chop'],
  [/hiperextensi|extensión lumbar/, 'backext'],
  [/granjero|farmer/, 'carry'],
  [/rueda abdominal|ab wheel/, 'plank'],
  [/abducción/, 'legext'],
  [/elíptica/, 'run'],
  [/carrera|correr|escaladora|cuerda|comba|double under|box jump|salto|bici|remo \(cardio\)/, 'run'],
];

const MUSCLE_FALLBACK: Record<string, string> = {
  Pecho: 'bench',
  Espalda: 'row',
  Piernas: 'squat',
  Hombros: 'ohp',
  Brazos: 'curl',
  Core: 'crunch',
  Cardio: 'run',
  'Cuerpo completo': 'thruster',
};

function patternFor(ex: Exercise): Pattern {
  const name = ex.name.toLowerCase();
  for (const [re, key] of RULES) {
    if (re.test(name)) return PATTERNS[key];
  }
  return PATTERNS[MUSCLE_FALLBACK[ex.muscle] ?? 'squat'];
}

type EquipKind = 'plate' | 'dumbbell' | 'kb' | 'none';

function equipFor(ex: Exercise): EquipKind {
  const t = `${ex.equipment} ${ex.name}`.toLowerCase();
  if (ex.category === 'Peso corporal') return 'none';
  if (t.includes('kettlebell') || t.includes('pesa rusa')) return 'kb';
  if (t.includes('mancuern')) return 'dumbbell';
  if (t.includes('barra fija')) return 'none';
  if (t.includes('barra') || t.includes('balón') || t.includes('disco')) return 'plate';
  return 'none';
}

const ALine: any = Animated.createAnimatedComponent(Line);
const ACircle: any = Animated.createAnimatedComponent(Circle);
const AG: any = Animated.createAnimatedComponent(G);

const JOINTS: (keyof Pose)[] = ['hd', 's', 'h', 'k1', 'a1', 'k2', 'a2', 'e', 'w'];

function ExerciseDemoBase({ exercise, size = 200 }: { exercise: Exercise; size?: number }) {
  const pattern = useMemo(() => patternFor(exercise), [exercise]);
  const equip = useMemo(
    () => (pattern.noWeight ? 'none' : equipFor(exercise)),
    [exercise, pattern]
  );
  const tint = muscleColors[exercise.muscle] ?? colors.primary;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const ms = pattern.ms ?? 950;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: ms,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(140),
        Animated.timing(progress, {
          toValue: 0,
          duration: ms,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(140),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pattern, progress]);

  // Coordenada animada entre la pose A y la B.
  const joints = useMemo(() => {
    const iv = (a: number, b: number) =>
      a === b ? a : progress.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
    const out = {} as Record<keyof Pose, { x: any; y: any }>;
    JOINTS.forEach((j) => {
      out[j] = {
        x: iv(pattern.a[j][0], pattern.b[j][0]),
        y: iv(pattern.a[j][1], pattern.b[j][1]),
      };
    });
    return out;
  }, [pattern, progress]);

  const stroke = '#eef3fb';
  const sw = 4.2;
  const gid = `demoBody-${exercise.id}`;
  const seg = (p: { x: any; y: any }, q: { x: any; y: any }, key: string) => (
    <ALine
      key={key}
      x1={p.x} y1={p.y} x2={q.x} y2={q.y}
      stroke={`url(#${gid})`}
      strokeWidth={sw}
      strokeLinecap="round"
    />
  );
  // Punto de articulación (rodillas, codo, hombro, cadera) en el color del músculo.
  const joint = (p: { x: any; y: any }, key: string, r = 2) => (
    <ACircle key={key} cx={p.x} cy={p.y} r={r} fill={tint} />
  );

  // Pies (solo si el tobillo está cerca del suelo en ambas poses).
  const feet: React.ReactNode[] = [];
  (['a1', 'a2'] as const).forEach((ank) => {
    if (pattern.a[ank][1] >= 84 && pattern.b[ank][1] >= 84) {
      const toe = {
        x: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [pattern.a[ank][0] + 7, pattern.b[ank][0] + 7],
        }),
        y: 92,
      };
      feet.push(seg(joints[ank], toe as any, `toe-${ank}`));
    }
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Degradado del cuerpo: claro arriba → tenue abajo, con matiz del músculo. */}
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#f4f8ff" />
            <Stop offset="1" stopColor="#aeb8c9" />
          </LinearGradient>
          {/* Fondo tipo "pantalla" con matiz del músculo. */}
          <LinearGradient id={`${gid}-bg`} x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={colors.bgElevated} />
            <Stop offset="1" stopColor={colors.surface} />
          </LinearGradient>
        </Defs>

        {/* Marco/pantalla */}
        <Rect x={1.5} y={1.5} width={97} height={97} rx={8} fill={`url(#${gid}-bg)`} />
        {/* Rejilla sutil */}
        {[26, 46, 66].map((y) => (
          <Line key={y} x1={8} y1={y} x2={92} y2={y} stroke={colors.border} strokeWidth={0.5} opacity={0.5} />
        ))}
        {/* Foco de color del músculo bajo la figura */}
        <Ellipse cx={50} cy={90} rx={26} ry={7} fill={tint} opacity={0.14} />
        {/* Sombra de contacto */}
        <Ellipse cx={50} cy={92.5} rx={17} ry={2.2} fill="#05070d" opacity={0.55} />

        {/* Suelo */}
        <Line x1={7} y1={92} x2={93} y2={92} stroke={colors.border} strokeWidth={1.4} strokeLinecap="round" />

        {/* Banco */}
        {pattern.bench ? (
          <>
            <Rect
              x={pattern.bench.x}
              y={pattern.bench.y}
              width={pattern.bench.w}
              height={4}
              rx={1.5}
              fill={colors.surfaceAlt}
            />
            <Line
              x1={pattern.bench.x + 3} y1={pattern.bench.y + 4}
              x2={pattern.bench.x + 3} y2={91}
              stroke={colors.surfaceAlt} strokeWidth={2.4}
            />
            <Line
              x1={pattern.bench.x + pattern.bench.w - 3} y1={pattern.bench.y + 4}
              x2={pattern.bench.x + pattern.bench.w - 3} y2={91}
              stroke={colors.surfaceAlt} strokeWidth={2.4}
            />
          </>
        ) : null}

        {/* Barra fija (dominadas/fondos) */}
        {pattern.bar ? (
          <Line
            x1={pattern.bar.x1} y1={pattern.bar.y}
            x2={pattern.bar.x2} y2={pattern.bar.y}
            stroke={colors.surfaceAlt} strokeWidth={2.6} strokeLinecap="round"
          />
        ) : null}

        {/* Cable de polea */}
        {pattern.cable ? (
          <ALine
            x1={pattern.cable[0]} y1={pattern.cable[1]}
            x2={joints.w.x} y2={joints.w.y}
            stroke={colors.textMuted} strokeWidth={1.4} strokeDasharray="3 3"
          />
        ) : null}

        {/* Figura (extremidades con degradado y remates redondeados) */}
        {seg(joints.h, joints.k2, 'thigh2')}
        {seg(joints.k2, joints.a2, 'shin2')}
        {seg(joints.s, joints.e, 'uarm')}
        {seg(joints.e, joints.w, 'farm')}
        {seg(joints.s, joints.h, 'torso')}
        {seg(joints.h, joints.k1, 'thigh1')}
        {seg(joints.k1, joints.a1, 'shin1')}
        {feet}
        {/* Articulaciones en color del músculo */}
        {joint(joints.h, 'j-h', 2.3)}
        {joint(joints.k1, 'j-k1')}
        {joint(joints.k2, 'j-k2', 1.7)}
        {joint(joints.e, 'j-e')}
        {/* Cabeza con aro del color del músculo */}
        <ACircle cx={joints.hd.x} cy={joints.hd.y} r={6} fill={stroke} />
        <ACircle cx={joints.hd.x} cy={joints.hd.y} r={6} fill="none" stroke={tint} strokeWidth={1.3} />

        {/* Peso en la mano */}
        {equip !== 'none' ? (
          <AG x={joints.w.x} y={joints.w.y}>
            {equip === 'plate' ? (
              <>
                <Circle r={6.4} fill="none" stroke={tint} strokeWidth={2.6} />
                <Circle r={1.7} fill={tint} />
              </>
            ) : null}
            {equip === 'dumbbell' ? (
              <>
                <Line x1={-4.4} y1={0} x2={4.4} y2={0} stroke={tint} strokeWidth={1.8} />
                <Circle cx={-4.4} r={2.6} fill={tint} />
                <Circle cx={4.4} r={2.6} fill={tint} />
              </>
            ) : null}
            {equip === 'kb' ? (
              <>
                <Circle cy={1.5} r={2.8} fill="none" stroke={tint} strokeWidth={1.6} />
                <Circle cy={6.2} r={4} fill={tint} />
              </>
            ) : null}
          </AG>
        ) : null}

        {/* Peso apoyado en la cadera (hip thrust con barra) */}
        {pattern.weightAt === 'hip' && equipFor(exercise) === 'plate' ? (
          <AG x={joints.h.x} y={joints.h.y}>
            <Circle cy={-5} r={6.2} fill="none" stroke={tint} strokeWidth={2.4} />
            <Circle cy={-5} r={1.6} fill={tint} />
          </AG>
        ) : null}
      </Svg>
    </View>
  );
}

export const ExerciseDemo = React.memo(
  ExerciseDemoBase,
  (a, b) => a.exercise.id === b.exercise.id && a.size === b.size
);
