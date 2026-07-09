import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, muscleColors } from '@/lib/theme';

interface Props {
  /** Series por grupo muscular, en el orden de `labels`. */
  values: number[];
  labels: string[];
  size?: number;
}

/**
 * Radar de balance muscular (estilo apps premium): un polígono sobre una
 * telaraña de 3 niveles muestra de un vistazo qué grupos dominan tu semana
 * y cuáles tienes abandonados.
 */
export function MuscleRadar({ values, labels, size = 240 }: Props) {
  const cx = size / 2;
  const cy = size / 2 + 4;
  const R = size / 2 - 34; // margen para etiquetas
  const n = labels.length;
  const max = Math.max(1, ...values);

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ];

  const polygon = values
    .map((v, i) => point(i, (Math.max(0, v) / max) * R).join(','))
    .join(' ');

  const grid = [0.33, 0.66, 1];

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0.25} />
          </LinearGradient>
        </Defs>

        {/* Telaraña */}
        {grid.map((g) => (
          <Polygon
            key={g}
            points={labels.map((_, i) => point(i, R * g).join(',')).join(' ')}
            fill="none"
            stroke={colors.border}
            strokeWidth={1}
            opacity={0.8}
          />
        ))}
        {labels.map((_, i) => {
          const [x, y] = point(i, R);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              opacity={0.6}
            />
          );
        })}

        {/* Área de la semana */}
        <Polygon
          points={polygon}
          fill="url(#radarGrad)"
          stroke={colors.primary}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />

        {/* Vértices + etiquetas */}
        {labels.map((label, i) => {
          const v = values[i] ?? 0;
          const [vx, vy] = point(i, (Math.max(0, v) / max) * R);
          const [lx, ly] = point(i, R + 17);
          const tint = muscleColors[label] ?? colors.primary;
          return (
            <React.Fragment key={label}>
              <Circle cx={vx} cy={vy} r={3.4} fill={tint} />
              <SvgText
                x={lx}
                y={ly - 2}
                fill={colors.text}
                fontSize={11}
                fontWeight="bold"
                textAnchor="middle"
              >
                {label}
              </SvgText>
              <SvgText
                x={lx}
                y={ly + 10}
                fill={v > 0 ? tint : colors.textMuted}
                fontSize={10}
                fontWeight="bold"
                textAnchor="middle"
              >
                {v}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
