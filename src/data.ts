/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectParams, Contractor, ProductionSheet, CalculatedRow, ProductionRow, GeneralPriceGuide } from './types';

export const INITIAL_PARAMS: ProjectParams = {
  percentIsr: 2,
  percentTss: 2.87,
  percentPension: 1,
  percentWarranty: 5,
  percentItbis: 18,
  isItbisInclusive: false,
  companyName: "MARES SRL",
  projectName: "Nuevo Proyecto",
  address: "",
  responsible: "",
  currency: "DOP",
  companyAddress: "Blvd. Primero de Noviembre, Edif. GAL, Local 29, Punta Cana",
  companyRfc: "1-30-721688-8",
  companyPhone: "(809) 959-1799",
  companyEmail: "info@constructoramares.com"
};

export const INITIAL_CONTRACTORS: Contractor[] = [];

export const INITIAL_SHEETS: ProductionSheet[] = [];

export function calculateRow(
  row: ProductionRow,
  contractors: Contractor[],
  params: ProjectParams,
  includeItbisInNet: boolean = false,
  applyIsr: boolean = true,
  applyTss: boolean = true,
  applyPension: boolean = true,
  applyWarranty: boolean = true,
  applyItbis: boolean = false,
  sheetContractorId?: string,
  customItbisRate?: number,
  overrideParams?: {
    percentIsr?: number;
    percentTss?: number;
    percentPension?: number;
    percentWarranty?: number;
    percentItbis?: number;
    isItbisInclusive?: boolean;
  }
): CalculatedRow {
  const finalContractorId = sheetContractorId || row.contractorId || "";
  const contractor = contractors.find(c => c.id === finalContractorId);
  const contractorName = contractor ? contractor.name : "No asignado";
  const contractorDoc = contractor ? contractor.document : "S/D";

  const grossValue = row.quantity * row.priceUnit;

  const effPercentIsr = overrideParams?.percentIsr !== undefined ? overrideParams.percentIsr : params.percentIsr;
  const effPercentTss = overrideParams?.percentTss !== undefined ? overrideParams.percentTss : params.percentTss;
  const effPercentPension = overrideParams?.percentPension !== undefined ? overrideParams.percentPension : params.percentPension;
  const effPercentWarranty = overrideParams?.percentWarranty !== undefined ? overrideParams.percentWarranty : params.percentWarranty;
  const effPercentItbis = overrideParams?.percentItbis !== undefined ? overrideParams.percentItbis : params.percentItbis;
  const effIsItbisInclusive = overrideParams?.isItbisInclusive !== undefined ? overrideParams.isItbisInclusive : params.isItbisInclusive;

  const itbisRate = typeof customItbisRate === 'number' ? customItbisRate : effPercentItbis;

  // Determine the base taxable gross value (excluding ITBIS if inclusive)
  const isItbisInclusive = effIsItbisInclusive === true;
  const baseGross = (applyItbis && isItbisInclusive)
    ? (grossValue / (1 + (itbisRate / 100)))
    : grossValue;

  // Calculate taxes and retentions on the base value
  const isr = applyIsr ? baseGross * (effPercentIsr / 100) : 0;
  const tss = applyTss ? baseGross * (effPercentTss / 100) : 0;
  const pension = applyPension ? baseGross * (effPercentPension / 100) : 0;
  
  // ITBIS calculation
  const itbis = applyItbis
    ? (isItbisInclusive ? grossValue - baseGross : grossValue * (itbisRate / 100))
    : 0;

  const warranty = applyWarranty ? baseGross * (effPercentWarranty / 100) : 0;

  // Neto a Pagar formulas
  const retencionesTotal = isr + tss + pension + warranty;
  let netPayable = 0;
  
  if (isItbisInclusive) {
    // If inclusive, the full gross value entered already has the ITBIS built-in.
    // If includeItbisInNet is true, we keep the ITBIS: (Net = Gross - Retenciones)
    // If includeItbisInNet is false, we must exclude the ITBIS: (Net = Base - Retenciones)
    netPayable = includeItbisInNet
      ? grossValue - retencionesTotal
      : baseGross - retencionesTotal;
  } else {
    // If exclusive, ITBIS sits on top of gross:
    netPayable = includeItbisInNet
      ? (grossValue + itbis) - retencionesTotal
      : grossValue - retencionesTotal;
  }

  return {
    row,
    contractorName,
    contractorDoc,
    grossValue: isItbisInclusive ? baseGross : grossValue, // Return baseGross so totals align correctly on taxable service amount
    isr,
    tss,
    pension,
    itbis,
    warranty,
    netPayable
  };
}

export function formatCurrencyValue(val: number, currency: string = "DOP"): string {
  const formatter = new Intl.NumberFormat('es-DO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(val);
}

export const INITIAL_GENERAL_PRICE_GUIDE: GeneralPriceGuide = {
  content: `=== GUÍA DE PRECIOS BASE Y ACUERDOS DE LA EMPRESA GENERAL ===
1. Albañilería y Obras de Block:
   - Asentado de block de 6 pulgadas (Mano de obra): DOP 350.00 / m2
   - Asentado de block de 8 pulgadas (Mano de obra): DOP 390.00 / m2
   - Pañete rústico o fino liso: DOP 220.00 / m2
   - Vaciado de dinteles de hormigón armado: DOP 180.00 / ml
   - Vaciado de soleras de hormigón: DOP 450.00 / m3

2. Varillero / Estructura de Acero:
   - Armado de vigas, columnas y losas (Acero grado 60 de 1/2"): DOP 48.00 / kg
   - Estribado de vigas maestras y mochetas de amarre: DOP 250.00 / ud
   - Colocación de malla electrosoldada: DOP 110.00 / m2

3. Revestimientos, Yeso y Terminación:
   - Revestimiento de yeso rústico en muros: DOP 120.00 / m2
   - Revestimiento de yeso decorativo o plafones fijos: DOP 210.00 / m2
   - Colocación de porcelanato importado (Mano de obra): DOP 450.00 / m2
   - Instalación de rodapié cerámico: DOP 95.00 / ml
   - Pintura general exterior/interior en muros: DOP 90.00 / m2

4. Instalaciones de Plomería y Electricidad:
   - Salida eléctrica de interruptor / tomacorriente general: DOP 350.00 / ud
   - Tendido de tubería conduit PVC de 3/4" para losa: DOP 75.00 / ml
   - Salida de agua fría o caliente para baño: DOP 950.00 / ud
   - Instalación de aparatos sanitarios (Inodoro/Lavamanos): DOP 1,200.00 / ud
   - Enlace de acometida general de 1" para plomería: DOP 1,500.00 / ud`,
  updatedAt: "2026-06-08T12:00:00Z"
};
