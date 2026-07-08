import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Exercise } from '@/lib/types';
import { muscleColors, colors, radius } from '@/lib/theme';

type IconType = 'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'bodyweight' | 'cardio';

/** Deduce el tipo de icono a partir del músculo y el equipo del ejercicio. */
function iconType(ex: Exercise): IconType {
  if (ex.muscle === 'Cardio') return 'cardio';
  const t = ex.equipment.toLowerCase();
  if (t.includes('kettlebell')) return 'kettlebell';
  if (t.includes('mancuerna')) return 'dumbbell';
  if (t.includes('barra') && !t.includes('fija')) return 'barbell';
  if (ex.category === 'Máquina') return 'machine';
  return 'bodyweight';
}

function Shape({ type, color }: { type: IconType; color: string }) {
  switch (type) {
    case 'barbell':
      return (
        <>
          <Rect x={8} y={45} width={84} height={10} rx={5} fill={color} />
          <Rect x={14} y={28} width={12} height={44} rx={4} fill={color} />
          <Rect x={4} y={36} width={9} height={28} rx={3} fill={color} />
          <Rect x={74} y={28} width={12} height={44} rx={4} fill={color} />
          <Rect x={87} y={36} width={9} height={28} rx={3} fill={color} />
        </>
      );
    case 'dumbbell':
      return (
        <>
          <Rect x={35} y={45} width={30} height={10} rx={5} fill={color} />
          <Rect x={16} y={30} width={16} height={40} rx={6} fill={color} />
          <Rect x={68} y={30} width={16} height={40} rx={6} fill={color} />
        </>
      );
    case 'kettlebell':
      return (
        <>
          <Path
            d="M36 42 Q36 22 50 22 Q64 22 64 42"
            stroke={color}
            strokeWidth={8}
            fill="none"
          />
          <Circle cx={50} cy={62} r={26} fill={color} />
        </>
      );
    case 'machine':
      return (
        <>
          <Rect x={20} y={14} width={60} height={72} rx={9} stroke={color} strokeWidth={6} fill="none" />
          <Rect x={34} y={34} width={32} height={8} rx={2} fill={color} />
          <Rect x={34} y={46} width={32} height={8} rx={2} fill={color} />
          <Rect x={34} y={58} width={32} height={8} rx={2} fill={color} />
        </>
      );
    case 'bodyweight':
      return (
        <>
          <Circle cx={50} cy={20} r={10} fill={color} />
          <Rect x={42} y={33} width={16} height={30} rx={8} fill={color} />
          <Line x1={44} y1={40} x2={26} y2={52} stroke={color} strokeWidth={6} strokeLinecap="round" />
          <Line x1={56} y1={40} x2={74} y2={52} stroke={color} strokeWidth={6} strokeLinecap="round" />
          <Line x1={46} y1={61} x2={38} y2={86} stroke={color} strokeWidth={6} strokeLinecap="round" />
          <Line x1={54} y1={61} x2={62} y2={86} stroke={color} strokeWidth={6} strokeLinecap="round" />
        </>
      );
    case 'cardio':
      return (
        <Path
          d="M8 55 H34 L42 32 L52 74 L60 55 H92"
          stroke={color}
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
  }
}

export function ExerciseIcon({ exercise, size = 46 }: { exercise: Exercise; size?: number }) {
  const color = muscleColors[exercise.muscle] ?? colors.primary;
  const type = iconType(exercise);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: color + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size * 0.66} height={size * 0.66} viewBox="0 0 100 100">
        <Shape type={type} color={color} />
      </Svg>
    </View>
  );
}
