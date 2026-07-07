import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Line, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '@/lib/theme';

export interface ChartPoint {
  value: number;
  label: string;
}

interface Props {
  data: ChartPoint[];
  width?: number;
  height?: number;
  unit?: string;
  color?: string;
}

/**
 * Gráfico de líneas simple con react-native-svg. Muestra la evolución de un
 * valor (p. ej. el peso máximo por sesión) con puntos y etiquetas mín/máx.
 */
export function LineChart({
  data,
  width = 320,
  height = 160,
  unit = '',
  color = colors.primary,
}: Props) {
  if (data.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>
          Necesitas al menos 2 sesiones con este ejercicio para ver tu progreso.
        </Text>
      </View>
    );
  }

  const padX = 34;
  const padY = 22;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => padX + (i / (data.length - 1)) * plotW;
  const y = (v: number) => padY + plotH - ((v - min) / range) * plotH;

  const path = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`)
    .join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Líneas guía superior/inferior */}
        <Line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke={colors.border} strokeWidth={1} />
        <Line
          x1={padX}
          y1={padY + plotH}
          x2={width - padX}
          y2={padY + plotH}
          stroke={colors.border}
          strokeWidth={1}
        />
        {/* Etiquetas del eje Y (máx/mín) */}
        <SvgText x={4} y={padY + 4} fill={colors.textMuted} fontSize={10}>
          {max}
        </SvgText>
        <SvgText x={4} y={padY + plotH} fill={colors.textMuted} fontSize={10}>
          {min}
        </SvgText>
        {/* Línea de datos */}
        <Path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {/* Puntos */}
        {data.map((d, i) => (
          <Circle key={i} cx={x(i)} cy={y(d.value)} r={4} fill={color} />
        ))}
        {/* Etiquetas del eje X (primera y última) */}
        <SvgText x={padX} y={height - 4} fill={colors.textMuted} fontSize={10} textAnchor="start">
          {data[0].label}
        </SvgText>
        <SvgText
          x={width - padX}
          y={height - 4}
          fill={colors.textMuted}
          fontSize={10}
          textAnchor="end"
        >
          {data[data.length - 1].label}
        </SvgText>
      </Svg>
      <Text style={styles.caption}>
        De {min}
        {unit} a {max}
        {unit} · {data.length} sesiones
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  caption: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
});
