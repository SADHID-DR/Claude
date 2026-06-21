/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProjectParams {
  percentIsr: number; // e.g. 10 for 10%
  percentTss: number; // e.g. 2 for 2%
  percentPension: number; // e.g. 2.87 for 2.87%
  percentWarranty: number; // e.g. 5 for 5%
  percentItbis: number; // e.g. 18 for 18%
  isItbisInclusive: boolean; // whether ITBIS is inclusive or exclusive
  companyName: string;
  projectName: string;
  address: string;
  responsible: string;
  currency: string; // e.g. 'DOP', 'USD', 'EUR'
  companyAddress?: string;
  companyRfc?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  logoStorageUrl?: string; // URL matching Firebase Storage file
}

export interface ContractorAgreement {
  id: string;
  projectName: string; // construction site/work name (e.g. "Torre Residencial Vista Real" or "General")
  content: string; // text with agreement terms, prices, special conditions
  fileName?: string; // name of the uploaded document/PDF
  fileBase64?: string; // base64 encoded file data
  fileStorageUrl?: string; // URL matching Firebase Storage file
  mimeType?: string; // mimeType of file
  updatedAt: string;
}

export interface GeneralPriceGuide {
  content: string;
  fileName?: string;
  fileBase64?: string;
  fileStorageUrl?: string; // URL matching Firebase Storage file
  mimeType?: string;
  updatedAt: string;
}

export interface Contractor {
  id: string;
  name: string;
  document: string; // Cédula/RNC/Pasaporte
  phone: string;
  address: string;
  type: string; // e.g. Pintura, Albañilería, Carpintería, Varillero
  status: 'Activo' | 'Inactivo';
  bank: string;
  account: string;
  email: string;
  observations: string;
  agreements?: ContractorAgreement[];
  assignedProjectIds?: string[];
  isHidden?: boolean;
}

export interface ProductionRow {
  id: string; // unique row id
  no: number; // line sequence number
  contractorId: string; // linked contractor
  description: string;
  quantity: number; // This serves as CANT. PRESUP. (original budgeted quantity)
  quantityFormula?: string; // formula used to calculate quantity
  quantityGrid?: string; // JSON holding spreadsheet grid configuration
  unit: string; // m2, m3, gl, kg, ud, etc.
  priceUnit: number;
  observations: string;
  subchapter?: string; // e.g. 'Primer Nivel', 'Segundo Nivel'
  createdReportId?: string; // Stamp identifying which report this row was introduced in
}

export interface ProductionReport {
  id: string;
  name: string; // e.g., "Reporte #1"
  dateFrom: string;
  dateTo: string;
  status: 'ABIERTO' | 'CERRADO';
  quantities: Record<string, number>; // row.id -> quantity actual in this report
  formulas?: Record<string, string>; // row.id -> formula used to calculate quantity actual
  grids?: Record<string, string>; // row.id -> structured JSON for specific grid data
  discount1: number;
  discount1Label?: string;
  discount2: number;
  discount2Label?: string;
  advancePayment?: number; // Anticipo
  isExtraordinary?: boolean; // Flag to identify sub-reports or complementary reports
  isWarrantyRelease?: boolean;
  warrantyDeduction?: number;
  warrantyDeductionLabel?: string;
  parentReportId?: string; // Linked parent report for sequence calculations
  savedPercentIsr?: number;
  savedPercentTss?: number;
  savedPercentPension?: number;
  savedPercentWarranty?: number;
  savedPercentItbis?: number;
  savedIsItbisInclusive?: boolean;
  savedApplyIsr?: boolean;
  savedApplyTss?: boolean;
  savedApplyPension?: boolean;
  savedApplyWarranty?: boolean;
  savedApplyItbis?: boolean;
  savedItbisRate?: number;
  supervisorSignature?: string; // Base64 of handwritten signature
}

export interface ProductionSheet {
  id: string; // e.g., 'op1', 'alb1', 'varill1'
  name: string; // Tab title/name, e.g., "Op1", "Albañilería"
  supervisor: string;
  dateFrom?: string;
  dateTo?: string;
  code: string;
  activity: string;
  rows: ProductionRow[];
  contractorId?: string; // Linked adjuster/contractor (owner of the sheet)
  applyIsr?: boolean;
  applyTss?: boolean;
  applyPension?: boolean;
  applyWarranty?: boolean;
  applyItbis?: boolean;
  itbisRate?: number; // custom ITBIS rate for this sheet, e.g. 1.8 or 18
  reports?: ProductionReport[];
  activeReportId?: string;
  lastSupervisorSignature?: string;
}

export interface CalculatedRow {
  row: ProductionRow;
  contractorName: string;
  contractorDoc: string;
  grossValue: number;
  isr: number;
  tss: number;
  pension: number;
  itbis: number;
  warranty: number;
  netPayable: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  user: string;
  action: string;
  details: string;
}

export interface Project {
  id: string;
  name: string;
  params: ProjectParams;
  sheets: ProductionSheet[];
  createdAt: string;
  createdBy?: string;
  status?: 'ACTIVA' | 'CERRADA';
  isHidden?: boolean;
}

export function formatDateReadable(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  // If already formatted like 15/jun/26, return it as lowercase
  if (/^\d{2}\/[a-z]{3}\/\d{2}$/i.test(clean)) {
    return clean.toLowerCase();
  }
  
  // Format YYYY-MM-DD
  const matchYmd = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchYmd) {
    const year = matchYmd[1].slice(-2);
    const monthIndex = parseInt(matchYmd[2], 10) - 1;
    const day = matchYmd[3];
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthStr = months[monthIndex] || '???';
    return `${day}/${monthStr}/${year}`;
  }

  // Fallback try with global Date
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const monthStr = months[d.getMonth()];
      return `${day}/${monthStr}/${year}`;
    }
  } catch (e) {
    // ignore
  }

  return clean;
}

export interface UserBaseEntry {
  id: string;
  name: string;
  phone: string;
  occupation: string;
  email: string;
  role: 'admin' | 'supervisor' | 'auditor';
  password?: string; // Optional for backward compatibility, will be added to new/existing
  projectRoles?: Record<string, 'supervisor' | 'auditor' | 'admin'>;
}


