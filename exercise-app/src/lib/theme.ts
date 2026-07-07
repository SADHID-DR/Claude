import { Platform, ViewStyle } from 'react-native';

/** Paleta y estilos base compartidos por la app (tema oscuro). */
export const colors = {
  bg: '#0b1120',
  bgElevated: '#0f172a',
  surface: '#18233b',
  surfaceAlt: '#334155',
  border: '#26324a',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primarySoft: '#14251f',
  accent: '#38bdf8',
  accentSoft: '#12243a',
  warn: '#fbbf24',
  danger: '#ef4444',
  streak: '#fb923c',
};

/** Parejas de color para degradados (react-native-svg / fondos). */
export const gradients = {
  primary: ['#22c55e', '#0ea5e9'],
  fire: ['#f97316', '#fb7185'],
  night: ['#1e293b', '#0b1120'],
  violet: ['#8b5cf6', '#38bdf8'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

/** Sombra sutil y consistente para tarjetas destacadas. */
export const shadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 6 },
  default: {},
}) as ViewStyle;

/** Color asociado a cada grupo muscular, para las etiquetas. */
export const muscleColors: Record<string, string> = {
  Pecho: '#f87171',
  Espalda: '#60a5fa',
  Piernas: '#34d399',
  Hombros: '#fbbf24',
  Brazos: '#a78bfa',
  Core: '#fb923c',
  Cardio: '#f472b6',
  'Cuerpo completo': '#2dd4bf',
};

/** Color asociado a cada categoría de equipo. */
export const categoryColors: Record<string, string> = {
  Máquina: '#38bdf8',
  'Peso libre': '#f59e0b',
  'Peso corporal': '#a3e635',
  CrossFit: '#fb7185',
};

/** Color asociado a cada formato de WOD. */
export const wodFormatColors: Record<string, string> = {
  AMRAP: '#38bdf8',
  'For Time': '#fb7185',
  EMOM: '#a78bfa',
  Rounds: '#34d399',
};
