import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type TabName = 'home' | 'dumbbell' | 'routines' | 'wods' | 'progress';

/**
 * Iconos de la barra inferior dibujados como SVG (línea limpia) en vez de
 * emojis: look más profesional y consistente con el color activo/inactivo.
 */
export function TabBarIcon({
  name,
  color,
  size = 26,
}: {
  name: TabName;
  color: string;
  size?: number;
}) {
  const sw = 2;
  const common = {
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      {name === 'home' && (
        <>
          <Path d="M4 13 L14 4 L24 13" {...common} />
          <Path d="M6.5 12 V23 H21.5 V12" {...common} />
        </>
      )}
      {name === 'dumbbell' && (
        <>
          <Line x1={9} y1={14} x2={19} y2={14} {...common} />
          <Rect x={3.5} y={9.5} width={3.5} height={9} rx={1.4} {...common} />
          <Rect x={21} y={9.5} width={3.5} height={9} rx={1.4} {...common} />
          <Line x1={2.5} y1={14} x2={3.5} y2={14} {...common} />
          <Line x1={24.5} y1={14} x2={25.5} y2={14} {...common} />
        </>
      )}
      {name === 'routines' && (
        <>
          <Rect x={6} y={4.5} width={16} height={19} rx={2.5} {...common} />
          <Line x1={10} y1={10} x2={18} y2={10} {...common} />
          <Line x1={10} y1={14} x2={18} y2={14} {...common} />
          <Line x1={10} y1={18} x2={15} y2={18} {...common} />
        </>
      )}
      {name === 'wods' && (
        <Path
          d="M14 3 C15.5 7 20 8.5 20 14 C20 18 17.3 21 14 21 C10.7 21 8 18.3 8 14.5 C8 12 9.5 11 10.5 9.5 C11 12 12.5 12.5 12.5 12.5 C12.5 9 13 6 14 3 Z"
          {...common}
        />
      )}
      {name === 'progress' && (
        <>
          <Path d="M5 4 V23 H24" {...common} />
          <Polyline points="8,18 13,12 16,15 22,7" {...common} />
          <Circle cx={22} cy={7} r={1.6} fill={color} stroke="none" />
        </>
      )}
    </Svg>
  );
}
