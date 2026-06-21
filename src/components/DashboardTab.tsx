/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ProjectParams, Contractor, ProductionSheet, AuditLogEntry } from '../types';
import { calculateRow, formatCurrencyValue } from '../data';
import { 
  ClipboardList, 
  Users, 
  ShieldAlert, 
  Coins, 
  Percent, 
  Building2, 
  HardHat, 
  FileDown, 
  PlusCircle,
  History,
  Clock,
  User,
  Trash2,
  Bell,
  AlertCircle,
  Calendar,
  Printer,
  TrendingUp,
  BarChart3
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

interface DashboardTabProps {
  params: ProjectParams;
  contractors: Contractor[];
  sheets: ProductionSheet[];
  includeItbisInNet: boolean;
  onNavigate: (tab: 'dashboard' | 'params' | 'contractors' | 'sheets' | 'resumen', sheetId?: string | null) => void;
  onAddNewSheet: () => void;
  onExportExcel: () => void;
  auditLogs?: AuditLogEntry[];
  currentUser?: string;
  onUpdateCurrentUser?: (user: string) => void;
  onClearAuditLogs?: () => void;
}

export default function DashboardTab({
  params,
  contractors,
  sheets,
  includeItbisInNet,
  onNavigate,
  onAddNewSheet,
  onExportExcel,
  auditLogs = [],
  currentUser = "Administrador Obra",
  onUpdateCurrentUser,
  onClearAuditLogs,
}: DashboardTabProps) {

  // --- LOCAL FILTER STATES ---
  const [filterContractor, setFilterContractor] = React.useState<string>('all');
  const [filterFromReport, setFilterFromReport] = React.useState<string>('');
  const [filterToReport, setFilterToReport] = React.useState<string>('');
  const [confirmClearLogs, setConfirmClearLogs] = React.useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = React.useState<boolean>(false);

  // Extract all unique report names across all active sheets/contractors to populate reports dropdowns
  const availableReports = useMemo(() => {
    const names = new Set<string>();
    sheets.forEach(sheet => {
      (sheet.reports || []).forEach(r => {
        if (r.name) {
          names.add(r.name.trim());
        }
      });
    });
    // Fallbacks if no reports exist yet
    if (names.size === 0) {
      names.add("Reporte #1");
      names.add("Reporte #2");
      names.add("Reporte #3");
    }
    // Sort alphabetically by name
    return Array.from(names).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [sheets]);

  // Auxiliary function to calculate contractor/row quantities filtered by report range matching
  const getFilteredQuantities = React.useCallback((sheet: ProductionSheet, rowId: string) => {
    const reports = sheet.reports || [];
    
    // Filter reports by report number/index if set
    if (filterFromReport || filterToReport) {
      const matchedReports = reports.filter(r => {
        if (filterFromReport) {
          if (r.name.localeCompare(filterFromReport, undefined, { numeric: true, sensitivity: 'base' }) < 0) return false;
        }
        if (filterToReport) {
          if (r.name.localeCompare(filterToReport, undefined, { numeric: true, sensitivity: 'base' }) > 0) return false;
        }
        return true;
      });
      
      // Sum quantities across all matching reports within range
      return matchedReports.reduce((sum, r) => sum + (r.quantities?.[rowId] ?? 0), 0);
    } else {
      // Default: use the specific active report
      const activeReport = reports.find(r => r.id === sheet.activeReportId) || reports[reports.length - 1];
      return activeReport?.quantities?.[rowId] ?? 0;
    }
  }, [filterFromReport, filterToReport]);

  const activeSheets = useMemo(() => {
    return sheets.filter(s => 
      contractors.some(c => c.id === s.contractorId) &&
      (filterContractor === 'all' || s.contractorId === filterContractor)
    );
  }, [sheets, contractors, filterContractor]);

  // Sum calculations matching active reports and filters
  const totals = useMemo(() => {
    let grossTotal = 0;
    let isrTotal = 0;
    let tssTotal = 0;
    let pensionTotal = 0;
    let itbisTotal = 0;
    let warrantyTotal = 0;
    let advanceTotal = 0;
    let discount1Total = 0;
    let discount2Total = 0;
    let warrantyDeductionTotal = 0;
    let releasedWarrantyTotal = 0;
    let netTotal = 0;
    let totalItems = 0;

    activeSheets.forEach(sheet => {
      const reports = sheet.reports || [];
      const activeReport = reports.find(r => r.id === sheet.activeReportId) || reports[reports.length - 1];
      const isClosed = activeReport?.status === "CERRADO";
      const isWarrantySheet = sheet.activity === "Pago de Retenciones de Garantía" || (sheet.code && sheet.code.startsWith("LIB-")) || (sheet.name && (sheet.name.startsWith("LIB-") || sheet.name.startsWith("Liberación")));

      // Match reports based on filters, same logic as getFilteredQuantities
      let matchedReports = [activeReport].filter(Boolean);
      const hasRangeFilter = !!(filterFromReport || filterToReport);
      if (hasRangeFilter) {
        matchedReports = reports.filter(r => {
          if (filterFromReport) {
            if (r.name.localeCompare(filterFromReport, undefined, { numeric: true, sensitivity: 'base' }) < 0) return false;
          }
          if (filterToReport) {
            if (r.name.localeCompare(filterToReport, undefined, { numeric: true, sensitivity: 'base' }) > 0) return false;
          }
          return true;
        });
      }

      advanceTotal += matchedReports.reduce((sum, r) => sum + (r.advancePayment || 0), 0);
      discount1Total += matchedReports.reduce((sum, r) => sum + (r.discount1 || 0), 0);
      discount2Total += matchedReports.reduce((sum, r) => sum + (r.discount2 || 0), 0);
      warrantyDeductionTotal += matchedReports.reduce((sum, r) => sum + ((r as any).warrantyDeduction || 0), 0);

      const applyIsr = isClosed && activeReport?.savedApplyIsr !== undefined
        ? activeReport.savedApplyIsr
        : sheet.applyIsr !== false;

      const applyTss = isClosed && activeReport?.savedApplyTss !== undefined
        ? activeReport.savedApplyTss
        : sheet.applyTss !== false;

      const applyPension = isClosed && activeReport?.savedApplyPension !== undefined
        ? activeReport.savedApplyPension
        : sheet.applyPension !== false;

      const applyWarranty = isClosed && activeReport?.savedApplyWarranty !== undefined
        ? activeReport.savedApplyWarranty
        : sheet.applyWarranty !== false;

      const applyItbis = isClosed && activeReport?.savedApplyItbis !== undefined
        ? activeReport.savedApplyItbis
        : sheet.applyItbis === true;

      const itbisRate = isClosed && activeReport?.savedItbisRate !== undefined
        ? activeReport.savedItbisRate
        : sheet.itbisRate;

      const overrideParams = isClosed && activeReport?.savedPercentIsr !== undefined
        ? {
            percentIsr: activeReport.savedPercentIsr,
            percentTss: activeReport.savedPercentTss,
            percentPension: activeReport.savedPercentPension,
            percentWarranty: activeReport.savedPercentWarranty,
            percentItbis: activeReport.savedPercentItbis,
            isItbisInclusive: activeReport.savedIsItbisInclusive,
          }
        : undefined;

      sheet.rows.forEach(row => {
        const q = getFilteredQuantities(sheet, row.id);
        const transientRow = {
          ...row,
          quantity: q
        };

        const calc = calculateRow(
          transientRow,
          contractors,
          params,
          includeItbisInNet,
          applyIsr,
          applyTss,
          applyPension,
          applyWarranty,
          applyItbis,
          sheet.contractorId,
          itbisRate,
          overrideParams
        );
        if (isWarrantySheet) {
          if (hasRangeFilter) {
            releasedWarrantyTotal += calc.grossValue;
          } else {
            const allReleaseQty = reports.reduce((sum, r) => sum + (r.quantities?.[row.id] ?? 0), 0);
            releasedWarrantyTotal += allReleaseQty * row.priceUnit;
          }
        } else {
          grossTotal += calc.grossValue;
          isrTotal += calc.isr;
          tssTotal += calc.tss;
          pensionTotal += calc.pension;
          itbisTotal += calc.itbis;
          if (hasRangeFilter) {
            warrantyTotal += calc.warranty;
          } else {
            let totalRetainedForThisRow = 0;
            const sheetItbisRate = typeof sheet.itbisRate === "number" ? sheet.itbisRate : params.percentItbis;
            reports.filter(r => r.status === "CERRADO").forEach(r => {
              const rQty = r.quantities?.[row.id] ?? 0;
              const rGross = rQty * row.priceUnit;
              let rBaseGross = rGross;
              if (params.isItbisInclusive && sheetItbisRate > 0 && sheet.applyItbis !== false) {
                rBaseGross = rGross / (1 + (sheetItbisRate / 100));
              }
              const rApplyWarranty = r.savedApplyWarranty !== undefined ? r.savedApplyWarranty : sheet.applyWarranty !== false;
              const rEffPercentWarranty = r.savedPercentWarranty ?? params.percentWarranty;
              if (rApplyWarranty) {
                totalRetainedForThisRow += (rBaseGross * rEffPercentWarranty) / 100;
              }
            });
            warrantyTotal += totalRetainedForThisRow;
          }
        }
        netTotal += calc.netPayable;
        totalItems++;
      });
    });

    const retencionesTotal = isrTotal + tssTotal + pensionTotal + warrantyTotal;
    
    // Deduct advance and discounts from net since calculateRow operates per row
    netTotal = netTotal - advanceTotal - discount1Total - discount2Total - warrantyDeductionTotal;

    return {
      gross: grossTotal,
      isr: isrTotal,
      tss: tssTotal,
      pension: pensionTotal,
      itbis: itbisTotal,
      warranty: warrantyTotal,
      advance: advanceTotal,
      discount1: discount1Total,
      discount2: discount2Total,
      warrantyDeduction: warrantyDeductionTotal,
      releasedWarranty: releasedWarrantyTotal,
      net: netTotal,
      retenciones: retencionesTotal,
      itemCount: totalItems
    };
  }, [activeSheets, contractors, params, includeItbisInNet, getFilteredQuantities, filterFromReport, filterToReport]);

  // Aggregate net payments per Contractor for SVG bar chart
  const contractorPayments = useMemo(() => {
    const list: { [name: string]: number } = {};
    activeSheets.forEach(sheet => {
      const reports = sheet.reports || [];
      const activeReport = reports.find(r => r.id === sheet.activeReportId) || reports[reports.length - 1];
      const isClosed = activeReport?.status === "CERRADO";

      const applyIsr = isClosed && activeReport.savedApplyIsr !== undefined
        ? activeReport.savedApplyIsr
        : sheet.applyIsr !== false;

      const applyTss = isClosed && activeReport.savedApplyTss !== undefined
        ? activeReport.savedApplyTss
        : sheet.applyTss !== false;

      const applyPension = isClosed && activeReport.savedApplyPension !== undefined
        ? activeReport.savedApplyPension
        : sheet.applyPension !== false;

      const applyWarranty = isClosed && activeReport.savedApplyWarranty !== undefined
        ? activeReport.savedApplyWarranty
        : sheet.applyWarranty !== false;

      const applyItbis = isClosed && activeReport.savedApplyItbis !== undefined
        ? activeReport.savedApplyItbis
        : sheet.applyItbis === true;

      const itbisRate = isClosed && activeReport.savedItbisRate !== undefined
        ? activeReport.savedItbisRate
        : sheet.itbisRate;

      const overrideParams = isClosed && activeReport.savedPercentIsr !== undefined
        ? {
            percentIsr: activeReport.savedPercentIsr,
            percentTss: activeReport.savedPercentTss,
            percentPension: activeReport.savedPercentPension,
            percentWarranty: activeReport.savedPercentWarranty,
            percentItbis: activeReport.savedPercentItbis,
            isItbisInclusive: activeReport.savedIsItbisInclusive,
          }
        : undefined;

      sheet.rows.forEach(row => {
        const q = getFilteredQuantities(sheet, row.id);
        const transientRow = {
          ...row,
          quantity: q
        };

        const calc = calculateRow(
          transientRow,
          contractors,
          params,
          includeItbisInNet,
          applyIsr,
          applyTss,
          applyPension,
          applyWarranty,
          applyItbis,
          sheet.contractorId,
          itbisRate,
          overrideParams
        );
        list[calc.contractorName] = (list[calc.contractorName] || 0) + calc.netPayable;
      });
    });
    return Object.entries(list)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // top 5
  }, [activeSheets, contractors, params, includeItbisInNet, getFilteredQuantities]);

  // Generate SVG Donut data dynamically matching current filtered calculations
  const donutData = useMemo(() => {
    const rawData = [
      { name: 'Pago Neto', value: totals.net, color: '#10B981' }, // emerald-500
      { name: 'Retención ISR', value: totals.isr, color: '#EF4444' }, // rose-500
      { name: 'Tasa TSS', value: totals.tss, color: '#F97316' }, // orange-500
      { name: 'Ret. Garantía', value: totals.warranty, color: '#F59E0B' }, // amber-500
      { name: 'Fondo de Pensiones', value: totals.pension, color: '#6366F1' }, // indigo-500
      { name: 'ITBIS Retenido', value: totals.itbis, color: '#3B82F6' }, // blue-500
    ].filter(item => item.value > 0);

    const sumVal = rawData.reduce((acc, item) => acc + item.value, 0) || 1;

    let accumulatedPercentage = 0;
    return rawData.map(item => {
      const pct = (item.value / sumVal) * 100;
      const startPct = accumulatedPercentage;
      accumulatedPercentage += pct;
      return {
        ...item,
        percentage: pct,
        startPercentage: startPct
      };
    });
  }, [totals]);

  // Aggregate monthly data for recharts payroll total per month
  const monthlyData = useMemo(() => {
    const monthsGroup: { [key: string]: { net: number; gross: number; retenciones: number, name: string } } = {};

    activeSheets.forEach(sheet => {
      const reports = sheet.reports || [];
      
      // Filter reports matching report number range if set
      let matchedReports = reports;
      
      if (filterFromReport || filterToReport) {
        matchedReports = reports.filter(r => {
          if (filterFromReport) {
            if (r.name.localeCompare(filterFromReport, undefined, { numeric: true, sensitivity: 'base' }) < 0) return false;
          }
          if (filterToReport) {
            if (r.name.localeCompare(filterToReport, undefined, { numeric: true, sensitivity: 'base' }) > 0) return false;
          }
          return true;
        });
      }

      matchedReports.forEach(report => {
        const isClosed = report.status === "CERRADO";

        const applyIsr = isClosed && report.savedApplyIsr !== undefined
          ? report.savedApplyIsr
          : sheet.applyIsr !== false;

        const applyTss = isClosed && report.savedApplyTss !== undefined
          ? report.savedApplyTss
          : sheet.applyTss !== false;

        const applyPension = isClosed && report.savedApplyPension !== undefined
          ? report.savedApplyPension
          : sheet.applyPension !== false;

        const applyWarranty = isClosed && report.savedApplyWarranty !== undefined
          ? report.savedApplyWarranty
          : sheet.applyWarranty !== false;

        const applyItbis = isClosed && report.savedApplyItbis !== undefined
          ? report.savedApplyItbis
          : sheet.applyItbis === true;

        const itbisRate = isClosed && report.savedItbisRate !== undefined
          ? report.savedItbisRate
          : sheet.itbisRate;

        const overrideParams = isClosed && report.savedPercentIsr !== undefined
          ? {
              percentIsr: report.savedPercentIsr,
              percentTss: report.savedPercentTss,
              percentPension: report.savedPercentPension,
              percentWarranty: report.savedPercentWarranty,
              percentItbis: report.savedPercentItbis,
              isItbisInclusive: report.savedIsItbisInclusive,
            }
          : undefined;

        let gross = 0;
        let retenciones = 0;
        let net = 0;

        sheet.rows.forEach(row => {
          const q = report.quantities?.[row.id] ?? 0;
          const transientRow = {
            ...row,
            quantity: q
          };

          const calc = calculateRow(
            transientRow,
            contractors,
            params,
            includeItbisInNet,
            applyIsr,
            applyTss,
            applyPension,
            applyWarranty,
            applyItbis,
            sheet.contractorId,
            itbisRate,
            overrideParams
          );
          gross += calc.grossValue;
          retenciones += (calc.isr + calc.tss + calc.pension + calc.warranty);
          net += calc.netPayable;
        });

        // Deduct advance and discounts
        const adv = report.advancePayment || 0;
        const d1 = report.discount1 || 0;
        const d2 = report.discount2 || 0;
        const wD = (report as any).warrantyDeduction || 0;
        net = net - adv - d1 - d2 - wD;

        let groupKey = "Varios";
        let sortKey = "9999-12";
        const dateStr = report.dateTo || report.dateFrom || sheet.dateTo || "";
        if (dateStr) {
          const parts = dateStr.split('-');
          if (parts.length >= 2) {
            const year = parts[0];
            const monthNum = parseInt(parts[1], 10);
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            if (monthNum >= 1 && monthNum <= 12) {
              groupKey = `${monthNames[monthNum - 1]} ${year}`;
              sortKey = `${year}-${parts[1]}`;
            }
          }
        }

        if (!monthsGroup[sortKey]) {
          monthsGroup[sortKey] = { net: 0, gross: 0, retenciones: 0, name: groupKey };
        }
        monthsGroup[sortKey].net += net;
        monthsGroup[sortKey].gross += gross;
        monthsGroup[sortKey].retenciones += retenciones;
      });
    });

    const sorted = Object.entries(monthsGroup)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([sortKey, d]) => ({
        key: sortKey,
        name: d.name,
        "Pago Neto": Math.max(0, Number(d.net.toFixed(2))),
        "Valor Bruto": Math.max(0, Number(d.gross.toFixed(2))),
        "Retenciones": Math.max(0, Number(d.retenciones.toFixed(2)))
      }));

    if (sorted.length === 0) {
      return [
        { name: 'Ene 2026', "Pago Neto": 0, "Valor Bruto": 0, "Retenciones": 0 },
        { name: 'Feb 2026', "Pago Neto": 0, "Valor Bruto": 0, "Retenciones": 0 },
        { name: 'Mar 2026', "Pago Neto": 0, "Valor Bruto": 0, "Retenciones": 0 }
      ];
    }
    return sorted;
  }, [activeSheets, contractors, params, includeItbisInNet, filterFromReport, filterToReport]);

  const contractorChartData = useMemo(() => {
    return contractorPayments.map(cp => ({
      name: cp.name,
      "Total Neto": Math.max(0, Number(cp.amount.toFixed(2)))
    }));
  }, [contractorPayments]);

  // Radius 40 circumference formula = 2 * Math.PI * r = 251.327
  const rCircumference = 2 * Math.PI * 40;

  // Process notifications (upcoming payment dates or pending open reports)
  const notifications = useMemo(() => {
    const notifs: { id: string, type: 'warning'|'info'|'danger', title: string, message: string, dateStr: string }[] = [];
    const now = new Date();
    
    activeSheets.forEach(sheet => {
      const openReports = (sheet.reports || []).filter(r => r.status === 'ABIERTO');
      openReports.forEach(report => {
        if (report.dateTo) {
          try {
            const reportDate = new Date(report.dateTo + 'T00:00:00'); // Assuming dateTo is YYYY-MM-DD
            const diffTime = reportDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const contractor = contractors.find(c => c.id === sheet.contractorId);
            const contractorName = contractor ? contractor.name : 'Desconocido';
            
            if (diffDays < 0) {
              notifs.push({
                id: `rep-overdue-${sheet.id}-${report.id}`,
                type: 'danger',
                title: 'Reporte Vencido',
                message: `El reporte "${report.name}" de la hoja de ${contractorName} (${sheet.name}) está vencido por ${Math.abs(diffDays)} días.`,
                dateStr: report.dateTo
              });
            } else if (diffDays <= 3) {
              notifs.push({
                id: `rep-soon-${sheet.id}-${report.id}`,
                type: 'warning',
                title: 'Cierre Próximo',
                message: `El reporte "${report.name}" de la hoja de ${contractorName} (${sheet.name}) vence en ${diffDays} días.`,
                dateStr: report.dateTo
              });
            } else {
              notifs.push({
                id: `rep-open-${sheet.id}-${report.id}`,
                type: 'info',
                title: 'Reporte Abierto',
                message: `El reporte "${report.name}" de la hoja de ${contractorName} (${sheet.name}) está pendiente de cierre para el ${report.dateTo}.`,
                dateStr: report.dateTo
              });
            }
          } catch(e) {}
        }
      });
    });
    
    return notifs.sort((a, b) => {
      const order = { 'danger': 0, 'warning': 1, 'info': 2 };
      if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
      return new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime();
    }).slice(0, 5); // top 5
  }, [activeSheets, contractors]);

  // Total active sheets
  const activeSheetsCount = activeSheets.length;

  return (
    <div id="dashboard-tab" className={showPrintPreview ? "fixed inset-0 z-[100] bg-slate-50 overflow-auto space-y-6 pt-16 px-4 pb-4 print:p-0 print:bg-white" : "space-y-6 print:bg-white print:p-0"}>
      {showPrintPreview && (
          <div className="fixed top-0 left-0 right-0 z-[110] bg-slate-800 text-slate-200 text-xs px-4 py-2 flex items-center justify-between shadow-md print:hidden">
             <div className="flex items-center gap-2">
                 <Printer size={13} className="text-amber-400" />
                 <span className="font-bold text-white">Vista Previa de Impresión: Dashboard</span>
             </div>
             <div className="flex items-center gap-2">
                 <button onClick={() => window.print()} title="Imprimir ahora" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded cursor-pointer border border-blue-500 flex items-center gap-2 transition-all font-bold">
                    <Printer size={13} />
                    Imprimir Documento
                 </button>
                 <button onClick={() => setShowPrintPreview(false)} title="Cerrar vista previa" className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded cursor-pointer border border-slate-600 flex items-center gap-2 transition-all">
                    Cerrar
                 </button>
             </div>
          </div>
      )}
      {/* Cabecera Exclusiva para Impresión */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase text-slate-900 font-sans tracking-tight">Informe General de Nóminas - Control de Obra</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">Proyecto: <span className="font-bold">{params.projectName}</span></p>
            <p className="text-xs text-slate-500 font-mono">Generado por: <span className="font-bold">{currentUser}</span> • Fecha: {new Date().toLocaleDateString('es-DO')}</p>
          </div>
          {params.companyLogo && (
            <img src={params.companyLogo} alt="Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
          )}
        </div>
        <div className="mt-4 bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px] grid grid-cols-3 gap-2">
          <div><strong>Filtro Contratista:</strong> {filterContractor === 'all' ? 'Todos los Contratistas' : contractors.find(c => c.id === filterContractor)?.name || filterContractor}</div>
          <div><strong>Desde Reporte:</strong> {filterFromReport || 'Inicio'}</div>
          <div><strong>Hasta Reporte:</strong> {filterToReport || 'Último'}</div>
        </div>
      </div>

      {/* Action Bar on-screen */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-250 p-3 rounded-xl mb-1">
        <div className="flex items-center space-x-2">
          <div className="p-1 px-2.5 rounded bg-blue-100 text-blue-700 font-sans font-bold text-[10px] uppercase tracking-wide">
            Vista Dashboard
          </div>
          <span className="text-xs text-slate-500 font-medium font-sans">Visualiza métricas, tendencias y realiza análisis financiero.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintPreview(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
            title="Abrir vista previa de impresión"
          >
            <Printer size={13} className="text-slate-200" />
            <span>Vista Previa Impresión</span>
          </button>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden print:hidden">
        <div className="absolute right-0 top-0 bottom-0 pointer-events-none flex items-center justify-end p-6 md:p-8">
          <img 
            src={params.companyLogo || "/logo.png"} 
            alt="Logo Empresa" 
            className={`w-auto h-full max-h-[180px] md:max-h-[200px] object-contain object-right ${params.companyLogo ? "opacity-20" : "opacity-10"}`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const nextEl = e.currentTarget.nextElementSibling;
              if (nextEl) nextEl.classList.remove('hidden');
            }}
          />
          <Building2 className="text-slate-200 hidden w-auto h-full max-h-[180px] md:max-h-[200px] opacity-10 object-contain object-right" />
        </div>
        <div className="max-w-xl space-y-2 relative z-10">
          <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-500/30">
            {params.projectName}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-2">
            Control de Nóminas y Ajustes de Obra
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Gestión automatizada de reportes de obra, cálculo de retenciones corporativas de ley (ISR, TSS, Fondos) e informes consolidados para subcontratistas.
          </p>
          <div className="pt-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Resp:</strong> {params.responsible}</span>
            <span>•</span>
            <span><strong>Empresa:</strong> {params.companyName}</span>
          </div>
        </div>
      </div>

      {/* NEW INTERACTIVE FILTERS BLOCK */}
      <div className="bg-white border border-slate-250 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        {/* Contractor Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase block">Filtrar por Contratista</label>
          <select
            value={filterContractor}
            onChange={(e) => setFilterContractor(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="all">[ TODOS LOS CONTRATISTAS ]</option>
            {[...contractors]
              .filter(c => sheets.some(s => s.contractorId === c.id))
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
              .map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
              ))}
          </select>
        </div>

        {/* From Report Selection */}
        <div className="space-y-1">
          <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase block">Desde Reporte</label>
          <select
            value={filterFromReport}
            onChange={(e) => {
              const val = e.target.value;
              setFilterFromReport(val);
              if (val && filterToReport) {
                if (val.localeCompare(filterToReport, undefined, { numeric: true, sensitivity: 'base' }) > 0) {
                  setFilterToReport(val);
                }
              }
            }}
            className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="">-- Todos (Desde Inicio) --</option>
            {availableReports.map((name) => {
              const isDisabled = filterToReport ? name.localeCompare(filterToReport, undefined, { numeric: true, sensitivity: 'base' }) > 0 : false;
              return (
                <option key={name} value={name} disabled={isDisabled}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>

        {/* To Report Selection */}
        <div className="space-y-1">
          <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase block">Hasta Reporte</label>
          <div className="flex gap-2">
            <select
              value={filterToReport}
              onChange={(e) => {
                const val = e.target.value;
                setFilterToReport(val);
                if (val && filterFromReport) {
                  if (filterFromReport.localeCompare(val, undefined, { numeric: true, sensitivity: 'base' }) > 0) {
                    setFilterFromReport(val);
                  }
                }
              }}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Todos (Hasta Último) --</option>
              {availableReports.map((name) => {
                const isDisabled = filterFromReport ? name.localeCompare(filterFromReport, undefined, { numeric: true, sensitivity: 'base' }) < 0 : false;
                return (
                  <option key={name} value={name} disabled={isDisabled}>
                    {name}
                  </option>
                );
              })}
            </select>
            {(filterContractor !== 'all' || filterFromReport || filterToReport) && (
              <button
                onClick={() => {
                  setFilterContractor('all');
                  setFilterFromReport('');
                  setFilterToReport('');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors whitespace-nowrap"
                title="Restablecer filtros"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm print:hidden">
          <div className="flex items-center space-x-2 mb-3">
            <Bell size={16} className="text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900">Notificaciones y Alertas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {notifications.map(n => (
              <div key={n.id} className={`p-3 rounded-lg flex gap-3 text-sm border 
                ${n.type === 'danger' ? 'bg-red-50 border-red-200 text-red-900' : 
                  n.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : 
                  'bg-blue-50 border-blue-200 text-blue-900'}`}>
                <div className="shrink-0 mt-0.5">
                  {n.type === 'danger' ? <AlertCircle size={16} className="text-red-500"/> :
                   n.type === 'warning' ? <Calendar size={16} className="text-amber-500" /> :
                   <ClipboardList size={16} className="text-blue-500" />}
                </div>
                <div>
                  <h4 className="font-bold text-[11px] uppercase tracking-wide">{n.title}</h4>
                  <p className="text-[11px] mt-0.5 font-medium opacity-90">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Numerical Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {/* Total Valor Bruto */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Total Bruto</div>
          <div>
            <div className="text-base xl:text-lg font-black text-slate-950 font-mono tracking-tight leading-none">
              {formatCurrencyValue(totals.gross, params.currency)}
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Suma volumen acumulado</p>
          </div>
        </div>

        {/* Retención ISR */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Retención ISR</div>
          <div>
            <div className="text-base xl:text-lg font-black text-rose-600 font-mono tracking-tight leading-none">
              {formatCurrencyValue(totals.isr, params.currency)}
            </div>
            <p className="text-[9px] text-rose-500/80 mt-1">Tasa retenida: {params.percentIsr}%</p>
          </div>
        </div>

        {/* Retención TSS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Seguridad TSS</div>
          <div>
            <div className="text-base xl:text-lg font-black text-orange-600 font-mono tracking-tight leading-none">
              {formatCurrencyValue(totals.tss, params.currency)}
            </div>
            <p className="text-[9px] text-orange-500/80 mt-1">Fondo de SS: {params.percentTss}%</p>
          </div>
        </div>

        {/* Retención Garantía */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ret. Garantía</div>
          <div>
            <div className="text-base xl:text-lg font-black text-amber-600 font-mono tracking-tight leading-none">
              {formatCurrencyValue(totals.warranty, params.currency)}
            </div>
            <p className="text-[9px] text-amber-600/85 mt-1">Fondo de retención {params.percentWarranty}%</p>
          </div>
        </div>

        {/* Garantía Liberada */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-200 hover:shadow-xs transition-all">
          <div className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Ret. Liberada</div>
          <div>
            <div className="text-base xl:text-lg font-black text-emerald-600 font-mono tracking-tight leading-none">
              {formatCurrencyValue(totals.releasedWarranty || 0, params.currency)}
            </div>
            <p className="text-[9px] text-emerald-500/80 mt-1">Garantía devuelta</p>
          </div>
        </div>

        {/* Acumulado ITBIS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">ITBIS Acum.</div>
          <div>
            <div className="text-base xl:text-lg font-black text-blue-600 font-mono tracking-tight leading-none">
              {formatCurrencyValue(totals.itbis, params.currency)}
            </div>
            <p className="text-[9px] text-blue-500/80 mt-1">Tasa calculada: {params.percentItbis === 1.8 ? "1.8% (07-2007)" : `${params.percentItbis}%`}</p>
          </div>
        </div>

        {/* Anticipos Aplicados */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-red-200 hover:shadow-xs transition-all">
          <div className="text-[10px] font-bold text-red-500 uppercase mb-2">Anticipos Aplic.</div>
          <div>
            <div className="text-base xl:text-lg font-black text-red-600 font-mono tracking-tight leading-none">
              {formatCurrencyValue(totals.advance, params.currency)}
            </div>
            <p className="text-[9px] text-red-500/80 mt-1">Pagos adelantados rebajados</p>
          </div>
        </div>

        {/* Deducción por Reparaciones */}
        {totals.warrantyDeduction > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-rose-200 hover:shadow-xs transition-all">
            <div className="text-[10px] font-bold text-rose-500 uppercase mb-2">Descto. Daños</div>
            <div>
              <div className="text-base xl:text-lg font-black text-rose-600 font-mono tracking-tight leading-none">
                {formatCurrencyValue(totals.warrantyDeduction, params.currency)}
              </div>
              <p className="text-[9px] text-rose-500/80 mt-1">Deducciones por Reparaciones (Lib. Ret.)</p>
            </div>
          </div>
        )}

        {/* Total Pagado (Neto) - HIGHLIGHTED AS IN THE DESIGN */}
        <div className="bg-blue-900 text-white border border-blue-850 rounded-xl p-4 shadow-md flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
          <div className="text-[10px] font-bold text-blue-200 uppercase mb-2">Neto a Pagar</div>
          <div>
            <div className="text-base xl:text-lg font-black font-mono tracking-tight leading-none text-white">
              {formatCurrencyValue(totals.net, params.currency)}
            </div>
            <p className="text-[9px] text-blue-200 mt-1">Líquido desembolsable</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Statistics Graph vs Shortcuts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Visualizations Bento Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* 1. Recharts Monthly Payroll Trend */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingUp size={15} className="text-blue-600" />
                    Historial de Nómina Mensual
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-tight">Total acumulado pagado paso a paso por mes</p>
                </div>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono uppercase">
                  {params.currency}
                </span>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNeto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} 
                      stroke="#CBD5E1" 
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} 
                      stroke="#CBD5E1"
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                        return val;
                      }}
                    />
                    <Tooltip
                      cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-800 shadow-md text-[10px] font-sans">
                              <p className="font-bold border-b border-slate-800 pb-1 mb-1 text-slate-300">{label}</p>
                              {payload.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between gap-4 py-0.5 font-mono">
                                  <span className="text-slate-400 capitalize">{item.name}:</span>
                                  <span className="font-bold text-slate-100">
                                    {formatCurrencyValue(item.value, params.currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Pago Neto" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorNeto)" 
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Recharts Contractor Payments Bar Chart */}
            <div className="space-y-4 border-t pt-4 md:border-t-0 md:pt-0 md:border-l md:pl-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 size={15} className="text-emerald-600" />
                    Pagos por Contratista
                  </h2>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono uppercase">
                    Corte Actual
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-tight mt-1">Comparativo de montos liquidados netos</p>
              </div>

              {contractorChartData.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                  Sin transacciones registradas
                </div>
              ) : (
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={contractorChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#64748B', fontSize: 8, fontFamily: 'sans-serif' }}
                        stroke="#CBD5E1"
                        tickFormatter={(val) => val.length > 10 ? `${val.substring(0, 10)}...` : val}
                      />
                      <YAxis 
                        tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} 
                        stroke="#CBD5E1"
                        tickFormatter={(val) => {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                          return val;
                        }}
                      />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-800 shadow-md text-[10px] font-sans">
                                <p className="font-bold border-b border-slate-800 pb-1 mb-1 text-slate-300">{label}</p>
                                <div className="flex justify-between gap-4 py-0.5 font-mono">
                                  <span className="text-slate-400">Total Neto:</span>
                                  <span className="font-bold text-emerald-400">
                                    {formatCurrencyValue(payload[0].value as number, params.currency)}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="Total Neto" radius={[4, 4, 0, 0]} maxBarSize={45} animationDuration={800}>
                        {contractorChartData.map((entry, index) => {
                          const barColors = ['#10B981', '#3B82F6', '#6366F1', '#F59E0B', '#8B5CF6', '#EC4899'];
                          return <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>

          {/* Deductions Breakdown Line Indicator */}
          <div className="bg-slate-50 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800">Cómputo Global de Descuentos</h4>
              <p className="text-[10px] text-slate-500">División porcentual entre montos pagados netos y retenciones fiscales / SS.</p>
            </div>

            <div className="flex items-center space-x-6">
              {totals.gross > 0 && (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">RETENCIONES</p>
                    <p className="font-mono text-xs font-bold text-rose-600">
                      {((totals.retenciones / totals.gross) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-16 bg-slate-200 h-2 rounded-full relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-rose-500 rounded-full" 
                      style={{ width: `${(totals.retenciones / totals.gross) * 100}%` }}
                    />
                  </div>
                  <div className="text-left border-l border-slate-200 pl-4">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">NETO RECIBIDO</p>
                    <p className="font-mono text-xs font-bold text-emerald-600">
                      {((totals.net / totals.gross) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Column 3 - Right Sidebar: Shortcuts & Audit Log */}
        <div className="space-y-6">
          {/* Shortcuts Panel - System Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              Acciones Clave de Automatización
            </h2>
            <p className="text-xs text-slate-500">
              Simplifique flujos de trabajo tradicionales de Excel mediante disparadores macros inteligentes:
            </p>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {/* Nueva hoja automática */}
              <button
                onClick={onAddNewSheet}
                className="group flex items-center justify-between w-full p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all text-slate-800 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <PlusCircle size={18} className="text-emerald-500 group-hover:text-emerald-300" />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Crear Hoja de Producción</p>
                    <p className="text-[10px] text-slate-500 group-hover:text-slate-400">OpX, AlbX, VarillX automáticas</p>
                  </div>
                </div>
              </button>

              {/* Registrar Contratista */}
              <button
                onClick={() => onNavigate('contractors')}
                className="group flex items-center justify-between w-full p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A] transition-all text-slate-800 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Users size={18} className="text-blue-500 group-hover:text-blue-300" />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Base de Contratistas</p>
                    <p className="text-[10px] text-slate-500 group-hover:text-slate-400">Verificar cédula, RNC y cuentas de banco</p>
                  </div>
                </div>
              </button>

              {/* Consolidar Resumen #1 */}
              <button
                onClick={() => onNavigate('resumen')}
                className="group flex items-center justify-between w-full p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all text-slate-800 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <ClipboardList size={18} className="text-blue-500 group-hover:text-blue-300" />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Ver Resumen</p>
                    <p className="text-[10px] text-slate-500 group-hover:text-slate-400">Consolidado general multi-archivo</p>
                  </div>
                </div>
              </button>

              {/* Exportar Excel */}
              <button
                onClick={onExportExcel}
                className="group flex items-center justify-between w-full p-3 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all text-emerald-800 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <FileDown size={18} className="text-emerald-600 group-hover:text-emerald-100" />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Exportar Libro Excel (.xlsx)</p>
                    <p className="text-[10px] text-emerald-600 group-hover:text-emerald-200">tblParametros, Resumen y hojas individuales</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Audit Log / Historial de Auditoría Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <History size={18} className="text-slate-700" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Historial (Audit Log)</h2>
                  <p className="text-[10px] text-slate-400 leading-none">Últimos 10 cambios en localStorage</p>
                </div>
              </div>
            </div>

            {/* Operator configuration widget */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block">Usuario / Operador</span>
                <div className="flex items-center space-x-1.5 focus-within:ring-1 focus-within:ring-blue-100 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <input
                    type="text"
                    value={currentUser}
                    onChange={(e) => onUpdateCurrentUser?.(e.target.value)}
                    placeholder="Escriba su nombre..."
                    className="text-xs font-bold text-slate-800 bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-28 placeholder-slate-400"
                    title="Editar nombre de usuario para el registro de auditoría"
                  />
                </div>
              </div>

              {auditLogs.length > 0 && onClearAuditLogs && (
                confirmClearLogs ? (
                  <div className="flex items-center space-x-1.5 bg-red-50 p-1 px-2 rounded border border-red-200">
                    <span className="text-[9px] text-red-600 font-bold">¿Borrar todo?</span>
                    <button
                      onClick={() => {
                        onClearAuditLogs();
                        setConfirmClearLogs(false);
                      }}
                      className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded hover:bg-red-700 cursor-pointer transition-colors"
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmClearLogs(false)}
                      className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded hover:bg-slate-300 cursor-pointer transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearLogs(true)}
                    className="flex items-center space-x-1 p-1 px-2 border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 text-[10px] font-bold rounded hover:bg-red-50 cursor-pointer transition-colors"
                    title="Limpiar logs de auditoría"
                  >
                    <Trash2 size={11} />
                    <span>Limpiar</span>
                  </button>
                )
              )}
            </div>

            {/* Audit log entries view */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 border border-dashed border-slate-100 rounded-lg">
                  <Clock size={20} strokeWidth={1.5} className="mb-1 text-slate-300" />
                  <p className="text-[11px] font-medium text-slate-500">Sin registros de auditoría</p>
                  <p className="text-[9px] text-slate-400">Las modificaciones a contratistas u hojas de producción aparecerán aquí.</p>
                </div>
              ) : (
                auditLogs.map((log) => {
                  const style = (() => {
                    const act = log.action.toLowerCase();
                    if (act.includes('crea')) return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-150', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' };
                    if (act.includes('elim') || act.includes('borr')) return { bg: 'bg-red-50 text-red-800 border-red-150', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' };
                    if (act.includes('restablecer') || act.includes('resete')) return { bg: 'bg-amber-50 text-amber-800 border-amber-150', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' };
                    return { bg: 'bg-blue-50/70 text-blue-900 border-blue-150', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' };
                  })();

                  const formattedDate = (() => {
                    try {
                      const d = new Date(log.timestamp);
                      return d.toLocaleString('es-DO', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      });
                    } catch(e) {
                      return log.timestamp;
                    }
                  })();

                  return (
                    <div 
                      key={log.id} 
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 hover:border-slate-200 transition-all rounded-lg space-y-1 text-left"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${style.badge}`}>
                          {log.action}
                        </span>
                        <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono">
                          <Clock size={9} />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        {log.details}
                      </p>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-200/50">
                        <User size={10} className="text-slate-400" />
                        <span>Por: <strong className="text-slate-700">{log.user}</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Active Production Sheets status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <HardHat size={18} className="text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">Hojas de Producción Activas</h2>
          </div>
          <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-md font-mono">
            {activeSheetsCount} registradas
          </span>
        </div>

        {activeSheets.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No hay reportes o actividades registradas que coincidan con los filtros.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSheets.map(sheet => {
              const sheetBudgetGross = sheet.rows.reduce((sum, r) => sum + (r.quantity * r.priceUnit), 0);

              const sheetActiveGross = sheet.rows.reduce((sum, r) => {
                const q = getFilteredQuantities(sheet, r.id);
                return sum + (q * r.priceUnit);
              }, 0);

              return (
                <div 
                  key={sheet.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-2xs transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-full uppercase font-sans">
                        {sheet.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{sheet.id}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium"><strong>Cód:</strong> {sheet.code}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1"><strong>Act:</strong> {sheet.activity}</p>
                    <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-400">
                      <span><strong>Sup:</strong> {sheet.supervisor}</span>
                      <span className="text-right"><strong>Presupuesto:</strong> {formatCurrencyValue(sheetBudgetGross, params.currency)}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block leading-none">Ejecutado Actual</span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {formatCurrencyValue(sheetActiveGross, params.currency)}
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigate('sheets', sheet.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Ir a hoja →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
