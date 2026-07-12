import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';

/**
 * Set de iconos SVG (línea limpia, trazo consistente) para reemplazar los
 * emojis estructurales: KPIs, marcadores de sección y controles. Escalan y
 * se pintan con `color`, a diferencia de los emojis. Los emojis expresivos
 * (ánimo, medallas, celebración) y los de diálogos nativos se conservan.
 */
export type IconName =
  | 'flame'      // racha
  | 'dumbbell'   // entrenos / fuerza
  | 'bars'       // volumen
  | 'muscle'     // fuerza / músculo
  | 'target'     // objetivos
  | 'trophy'     // logros / PRs
  | 'eye'        // ver demo
  | 'pencil'     // editar
  | 'trash'      // borrar
  | 'close'      // cerrar
  | 'check'      // hecho
  | 'chart'      // progreso
  | 'bulb'       // insight
  | 'bell'       // recordatorio
  | 'clock'      // tiempo / descanso
  | 'calendar'   // plan / calendario
  | 'share'      // compartir
  | 'watch';     // wearable

export function Icon({
  name,
  size = 20,
  color = colors.text,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const c = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'flame' && (
        <Path
          d="M12 3 C13 7 17 8 16.5 13 C16.2 16.5 14.4 19 12 19 C9.6 19 7.5 17 7.5 13.8 C7.5 11.5 9 10.5 9.7 9 C10.2 11 11 11.3 11 11.3 C11 8.5 11.3 5.8 12 3 Z"
          {...c}
        />
      )}
      {name === 'dumbbell' && (
        <>
          <Line x1={7.5} y1={12} x2={16.5} y2={12} {...c} />
          <Rect x={2.5} y={8} width={3} height={8} rx={1.2} {...c} />
          <Rect x={18.5} y={8} width={3} height={8} rx={1.2} {...c} />
          <Line x1={5.5} y1={12} x2={7.5} y2={12} {...c} />
          <Line x1={16.5} y1={12} x2={18.5} y2={12} {...c} />
        </>
      )}
      {name === 'bars' && (
        <>
          <Line x1={6} y1={20} x2={6} y2={13} {...c} />
          <Line x1={12} y1={20} x2={12} y2={8} {...c} />
          <Line x1={18} y1={20} x2={18} y2={4} {...c} />
        </>
      )}
      {name === 'muscle' && (
        <Path
          d="M4 20 V13 C4 9 7 7 9 7 C10.5 7 11 8 11 9.5 C11 11 10 12 12 12 L17 12 C19 12 20 13.5 20 15.5 C20 18 18 20 15 20 Z"
          {...c}
        />
      )}
      {name === 'target' && (
        <>
          <Circle cx={12} cy={12} r={8} {...c} />
          <Circle cx={12} cy={12} r={4} {...c} />
          <Circle cx={12} cy={12} r={1} fill={color} stroke="none" />
        </>
      )}
      {name === 'trophy' && (
        <>
          <Path d="M7 4 H17 V9 C17 12 15 13.5 12 13.5 C9 13.5 7 12 7 9 Z" {...c} />
          <Path d="M7 5 H4 V7 C4 9 5.5 10 7 10" {...c} />
          <Path d="M17 5 H20 V7 C20 9 18.5 10 17 10" {...c} />
          <Line x1={12} y1={13.5} x2={12} y2={17} {...c} />
          <Line x1={8.5} y1={20} x2={15.5} y2={20} {...c} />
          <Line x1={10} y1={17} x2={14} y2={17} {...c} />
        </>
      )}
      {name === 'eye' && (
        <>
          <Path d="M2.5 12 C5 7 9 5 12 5 C15 5 19 7 21.5 12 C19 17 15 19 12 19 C9 19 5 17 2.5 12 Z" {...c} />
          <Circle cx={12} cy={12} r={3} {...c} />
        </>
      )}
      {name === 'pencil' && (
        <>
          <Path d="M4 20 L4 16.5 L15 5.5 L18.5 9 L7.5 20 Z" {...c} />
          <Line x1={13} y1={7.5} x2={16.5} y2={11} {...c} />
        </>
      )}
      {name === 'trash' && (
        <>
          <Line x1={4} y1={6.5} x2={20} y2={6.5} {...c} />
          <Path d="M6 6.5 L7 20 H17 L18 6.5" {...c} />
          <Path d="M9.5 6.5 V4.5 H14.5 V6.5" {...c} />
          <Line x1={10} y1={10} x2={10} y2={17} {...c} />
          <Line x1={14} y1={10} x2={14} y2={17} {...c} />
        </>
      )}
      {name === 'close' && (
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...c} />
          <Line x1={18} y1={6} x2={6} y2={18} {...c} />
        </>
      )}
      {name === 'check' && <Polyline points="5,13 10,18 19,6" {...c} />}
      {name === 'chart' && (
        <>
          <Path d="M4 4 V20 H20" {...c} />
          <Polyline points="7,15 11,10 14,13 19,6" {...c} />
        </>
      )}
      {name === 'bulb' && (
        <>
          <Path d="M9 15 C6.5 13.5 6 11 6 9.5 C6 6.5 8.5 4.5 12 4.5 C15.5 4.5 18 6.5 18 9.5 C18 11 17.5 13.5 15 15 V17 H9 Z" {...c} />
          <Line x1={9.5} y1={20} x2={14.5} y2={20} {...c} />
        </>
      )}
      {name === 'bell' && (
        <>
          <Path d="M6 17 C6 17 7.5 15.5 7.5 11 C7.5 7.5 9.5 5.5 12 5.5 C14.5 5.5 16.5 7.5 16.5 11 C16.5 15.5 18 17 18 17 Z" {...c} />
          <Path d="M10.5 20 C11 20.6 13 20.6 13.5 20" {...c} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx={12} cy={12} r={8} {...c} />
          <Polyline points="12,7.5 12,12 15,14" {...c} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={4} y={5.5} width={16} height={15} rx={2.5} {...c} />
          <Line x1={4} y1={9.5} x2={20} y2={9.5} {...c} />
          <Line x1={8.5} y1={3.5} x2={8.5} y2={7} {...c} />
          <Line x1={15.5} y1={3.5} x2={15.5} y2={7} {...c} />
        </>
      )}
      {name === 'share' && (
        <>
          <Circle cx={7} cy={12} r={2.5} {...c} />
          <Circle cx={17} cy={6} r={2.5} {...c} />
          <Circle cx={17} cy={18} r={2.5} {...c} />
          <Line x1={9.2} y1={10.8} x2={14.8} y2={7.2} {...c} />
          <Line x1={9.2} y1={13.2} x2={14.8} y2={16.8} {...c} />
        </>
      )}
      {name === 'watch' && (
        <>
          <Rect x={7} y={7} width={10} height={10} rx={2.5} {...c} />
          <Line x1={9.5} y1={7} x2={9.5} y2={4} {...c} />
          <Line x1={14.5} y1={7} x2={14.5} y2={4} {...c} />
          <Line x1={9.5} y1={17} x2={9.5} y2={20} {...c} />
          <Line x1={14.5} y1={17} x2={14.5} y2={20} {...c} />
        </>
      )}
    </Svg>
  );
}
