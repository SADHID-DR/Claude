import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Genera un .xlsx de muestra realista para probar el flujo de importación.
// Estructura: Materiales · Mano de Obra · Equipos · APU · APU_Componentes · Presupuesto

const materials = [
  { Código: "MAT-CEM-01", Descripción: "Cemento Portland gris (saco 42.5 kg)", Unidad: "saco", Categoría: "Cemento", Precio: 380, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
  { Código: "MAT-ARN-01", Descripción: "Arena lavada de río", Unidad: "m3", Categoría: "Agregados", Precio: 1100, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
  { Código: "MAT-GRA-01", Descripción: "Grava 3/4", Unidad: "m3", Categoría: "Agregados", Precio: 1250, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
  { Código: "MAT-AGA-01", Descripción: "Agua para mezcla", Unidad: "m3", Categoría: "Consumibles", Precio: 65, Moneda: "DOP", Tasa: 1, ITBIS: "No" },
  { Código: "MAT-VAR-04", Descripción: "Varilla #4 grado 60 (qq)", Unidad: "qq", Categoría: "Acero", Precio: 4800, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
  { Código: "MAT-VAR-05", Descripción: "Varilla #5 grado 60 (qq)", Unidad: "qq", Categoría: "Acero", Precio: 4750, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
  { Código: "MAT-ALM-01", Descripción: "Alambre de amarre #18", Unidad: "lb", Categoría: "Acero", Precio: 55, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
  { Código: "MAT-BLO-06", Descripción: "Block de hormigón 6\"", Unidad: "ud", Categoría: "Mampostería", Precio: 38, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
  { Código: "MAT-PIN-01", Descripción: "Pintura acrílica blanca (galón)", Unidad: "gln", Categoría: "Acabados", Precio: 1150, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
  { Código: "MAT-MAD-01", Descripción: "Madera de pino 2x4x8'", Unidad: "pt", Categoría: "Encofrado", Precio: 65, Moneda: "DOP", Tasa: 1, ITBIS: "Sí" },
];

const labors = [
  { Código: "MO-MAE-01", Descripción: "Maestro de obras", Unidad: "HH", Tarifa: 350 },
  { Código: "MO-ALB-01", Descripción: "Albañil", Unidad: "HH", Tarifa: 220 },
  { Código: "MO-AYU-01", Descripción: "Ayudante", Unidad: "HH", Tarifa: 140 },
  { Código: "MO-PIN-01", Descripción: "Pintor", Unidad: "HH", Tarifa: 240 },
  { Código: "MO-CAR-01", Descripción: "Carpintero de encofrado", Unidad: "HH", Tarifa: 280 },
];

const equipments = [
  { Código: "EQ-MEZ-01", Descripción: "Mezcladora de hormigón 1 saco", Unidad: "HM", Tarifa: 180 },
  { Código: "EQ-VIB-01", Descripción: "Vibrador de inmersión", Unidad: "HM", Tarifa: 120 },
  { Código: "EQ-AND-01", Descripción: "Andamio metálico (set)", Unidad: "día", Tarifa: 250 },
];

const apus = [
  { Código: "APU-HOR-210", Descripción: "Hormigón fc=210 kg/cm2 vaciado", Unidad: "m3", Overhead: 10, Utilidad: 8 },
  { Código: "APU-ACE-COL", Descripción: "Acero de refuerzo en columnas", Unidad: "qq", Overhead: 10, Utilidad: 8 },
  { Código: "APU-MUR-BLO", Descripción: "Muro de block 6\" pegado", Unidad: "m2", Overhead: 12, Utilidad: 8 },
  { Código: "APU-PIN-INT", Descripción: "Pintura interior 2 manos", Unidad: "m2", Overhead: 8, Utilidad: 8 },
  { Código: "APU-ENC-COL", Descripción: "Encofrado de columna", Unidad: "m2", Overhead: 10, Utilidad: 8 },
];

const apuComponents = [
  // Hormigón 210 kg/cm2 — receta por m3
  { APU: "APU-HOR-210", RefCode: "MAT-CEM-01", Tipo: "MATERIAL", Cantidad: 8.5, Desperdicio: 3 },
  { APU: "APU-HOR-210", RefCode: "MAT-ARN-01", Tipo: "MATERIAL", Cantidad: 0.45, Desperdicio: 5 },
  { APU: "APU-HOR-210", RefCode: "MAT-GRA-01", Tipo: "MATERIAL", Cantidad: 0.85, Desperdicio: 5 },
  { APU: "APU-HOR-210", RefCode: "MAT-AGA-01", Tipo: "MATERIAL", Cantidad: 0.2, Desperdicio: 0 },
  { APU: "APU-HOR-210", RefCode: "MO-ALB-01", Tipo: "LABOR", Cantidad: 3, Desperdicio: 0 },
  { APU: "APU-HOR-210", RefCode: "MO-AYU-01", Tipo: "LABOR", Cantidad: 5, Desperdicio: 0 },
  { APU: "APU-HOR-210", RefCode: "EQ-MEZ-01", Tipo: "EQUIPMENT", Cantidad: 1.5, Desperdicio: 0 },
  { APU: "APU-HOR-210", RefCode: "EQ-VIB-01", Tipo: "EQUIPMENT", Cantidad: 0.8, Desperdicio: 0 },

  // Acero en columnas — receta por qq
  { APU: "APU-ACE-COL", RefCode: "MAT-VAR-05", Tipo: "MATERIAL", Cantidad: 1, Desperdicio: 7 },
  { APU: "APU-ACE-COL", RefCode: "MAT-ALM-01", Tipo: "MATERIAL", Cantidad: 0.8, Desperdicio: 0 },
  { APU: "APU-ACE-COL", RefCode: "MO-ALB-01", Tipo: "LABOR", Cantidad: 1.2, Desperdicio: 0 },
  { APU: "APU-ACE-COL", RefCode: "MO-AYU-01", Tipo: "LABOR", Cantidad: 1.0, Desperdicio: 0 },

  // Muro de block 6" — receta por m2
  { APU: "APU-MUR-BLO", RefCode: "MAT-BLO-06", Tipo: "MATERIAL", Cantidad: 12.5, Desperdicio: 4 },
  { APU: "APU-MUR-BLO", RefCode: "MAT-CEM-01", Tipo: "MATERIAL", Cantidad: 0.4, Desperdicio: 3 },
  { APU: "APU-MUR-BLO", RefCode: "MAT-ARN-01", Tipo: "MATERIAL", Cantidad: 0.035, Desperdicio: 5 },
  { APU: "APU-MUR-BLO", RefCode: "MO-ALB-01", Tipo: "LABOR", Cantidad: 0.8, Desperdicio: 0 },
  { APU: "APU-MUR-BLO", RefCode: "MO-AYU-01", Tipo: "LABOR", Cantidad: 0.5, Desperdicio: 0 },

  // Pintura interior 2 manos — por m2
  { APU: "APU-PIN-INT", RefCode: "MAT-PIN-01", Tipo: "MATERIAL", Cantidad: 0.04, Desperdicio: 8 },
  { APU: "APU-PIN-INT", RefCode: "MO-PIN-01", Tipo: "LABOR", Cantidad: 0.25, Desperdicio: 0 },

  // Encofrado de columna — por m2
  { APU: "APU-ENC-COL", RefCode: "MAT-MAD-01", Tipo: "MATERIAL", Cantidad: 3.5, Desperdicio: 10 },
  { APU: "APU-ENC-COL", RefCode: "MO-CAR-01", Tipo: "LABOR", Cantidad: 1.5, Desperdicio: 0 },
  { APU: "APU-ENC-COL", RefCode: "MO-AYU-01", Tipo: "LABOR", Cantidad: 1.0, Desperdicio: 0 },
  { APU: "APU-ENC-COL", RefCode: "EQ-AND-01", Tipo: "EQUIPMENT", Cantidad: 0.05, Desperdicio: 0 },
];

const presupuesto = [
  { Tipo: "CAPITULO", Código: "01", Descripción: "Estructura de hormigón" },
  { Tipo: "Item", Capítulo: "01", Código: "01.01", Descripción: "Hormigón fc=210 en zapatas", Unidad: "m3", Cantidad: 45, APU: "APU-HOR-210" },
  { Tipo: "Item", Capítulo: "01", Código: "01.02", Descripción: "Hormigón fc=210 en columnas", Unidad: "m3", Cantidad: 28, APU: "APU-HOR-210" },
  { Tipo: "Item", Capítulo: "01", Código: "01.03", Descripción: "Hormigón fc=210 en losas", Unidad: "m3", Cantidad: 62, APU: "APU-HOR-210" },
  { Tipo: "Item", Capítulo: "01", Código: "01.04", Descripción: "Acero de refuerzo en columnas", Unidad: "qq", Cantidad: 320, APU: "APU-ACE-COL" },
  { Tipo: "Item", Capítulo: "01", Código: "01.05", Descripción: "Encofrado de columnas", Unidad: "m2", Cantidad: 180, APU: "APU-ENC-COL" },

  { Tipo: "CAPITULO", Código: "02", Descripción: "Mampostería" },
  { Tipo: "Item", Capítulo: "02", Código: "02.01", Descripción: "Muros exteriores block 6\"", Unidad: "m2", Cantidad: 420, APU: "APU-MUR-BLO" },
  { Tipo: "Item", Capítulo: "02", Código: "02.02", Descripción: "Muros interiores block 6\"", Unidad: "m2", Cantidad: 310, APU: "APU-MUR-BLO" },

  { Tipo: "CAPITULO", Código: "03", Descripción: "Acabados" },
  { Tipo: "Item", Capítulo: "03", Código: "03.01", Descripción: "Pintura interior", Unidad: "m2", Cantidad: 620, APU: "APU-PIN-INT" },
  { Tipo: "Item", Capítulo: "03", Código: "03.02", Descripción: "Limpieza final de obra", Unidad: "gl", Cantidad: 1 }, // sin APU — para probar diagnóstico IA
];

function main() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materials), "Materiales");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(labors), "Mano de Obra");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(equipments), "Equipos");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(apus), "APU");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(apuComponents), "APU_Componentes");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(presupuesto), "Presupuesto");

  mkdirSync("sample", { recursive: true });
  const outPath = join("sample", "presupuesto-mares-demo.xlsx");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  writeFileSync(outPath, buf);
  console.log(`✓ Excel de muestra generado: ${outPath}`);
}

main();
