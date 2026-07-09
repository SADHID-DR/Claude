/**
 * Unidades de peso: los datos SIEMPRE se guardan en kg (consistencia del
 * historial); la conversión a libras ocurre solo al mostrar/introducir.
 */
export type WeightUnit = 'kg' | 'lb';

export const KG_TO_LB = 2.2046226;

/** kg internos → valor en la unidad elegida. */
export function toDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg * KG_TO_LB;
}

/** Valor introducido en la unidad elegida → kg internos. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / KG_TO_LB;
}

/** Redondeo a discos reales: 2,5 kg o 5 lb. */
export function roundLoad(value: number, unit: WeightUnit): number {
  const step = unit === 'kg' ? 2.5 : 5;
  return Math.round(value / step) * step;
}

/** Formatea kg internos en la unidad elegida, p. ej. "80 kg" / "175 lb". */
export function fmtWeight(
  kg: number,
  unit: WeightUnit,
  opts?: { round?: boolean }
): string {
  const v = toDisplay(kg, unit);
  const n = opts?.round ? roundLoad(v, unit) : Math.round(v * 10) / 10;
  return `${n} ${unit}`;
}
