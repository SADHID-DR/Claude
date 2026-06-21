/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { ProjectParams, Contractor, ProductionSheet, formatDateReadable } from "../types";
import { calculateRow, formatCurrencyValue } from "../data";
import { MeasurementGrid } from "./MeasurementGrid";
import {
  Search,
  Printer,
  FileText,
  CheckCircle,
  ListFilter,
  Users,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface ResumenTabProps {
  params: ProjectParams;
  contractors: Contractor[];
  sheets: ProductionSheet[];
  includeItbisInNet: boolean;
  onNavigate?: (
    tab: "dashboard" | "params" | "contractors" | "sheets" | "resumen",
    sheetId?: string | null,
  ) => void;
  onMassCloseReports?: () => void;
}

type GroupByOption = "detallado" | "contratista" | "hoja";

export default function ResumenTab({
  params,
  contractors,
  sheets,
  includeItbisInNet,
  onNavigate,
  onMassCloseReports,
}: ResumenTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("contratista");
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [collapsedContractors, setCollapsedContractors] = useState<
    Record<string, boolean>
  >({});
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [includeDetails, setIncludeDetails] = useState(false);
  const [printWithMeasurements, setPrintWithMeasurements] = useState(false);
  const [paperSize, setPaperSize] = useState<"letter" | "legal" | "a4" | "a3">("letter");
  const [contractorObservations, setContractorObservations] = useState<
    Record<string, string>
  >({
    andresalbarelleria:
      "Trabajos conformes con plano de fecha 15 de mayo de 2026.",
    alejandrohernandezcon_doc_002:
      "Avances auditados en campo según reporte de hito estructural.",
    "cont-001":
      "Revisión técnica conforme. Avance físico de obra según planos aprobados.",
  });
  const [resumenObservations, setResumenObservations] = useState<string>(
    "El presente resumen de reporte físico de obra y liquidación consolidada se emite para fines de validación técnica e información contable de la empresa. Los cálculos de retenciones y adicionales han sido auditados en base a las hojas de producción activas.",
  );

  const activeSheets = useMemo(() => {
    return sheets;
  }, [sheets]);

  const has18Itbis = useMemo(() => {
    return activeSheets.some(
      (s) =>
        s.applyItbis === true &&
        (s.itbisRate === 1.8 || (s.itbisRate === undefined && params.percentItbis === 1.8))
    );
  }, [activeSheets, params.percentItbis]);

  // Extract and sequence unique periods chronologically from actual reports of all sheets
  const sortedPeriods = useMemo(() => {
    // Collect unique periods from active sheets by date range
    const periodMap = new Map<
      string,
      { id: string; name: string; dateFrom: string; dateTo: string }
    >();

    activeSheets.forEach((s) => {
      const reps = s.reports || [];
      reps.forEach((r) => {
        if (r.id && r.dateFrom && r.dateTo) {
          const dateKey = `${r.dateFrom}_${r.dateTo}`;
          if (!periodMap.has(dateKey)) {
            periodMap.set(dateKey, {
              id: r.id,
              name: r.name,
              dateFrom: r.dateFrom,
              dateTo: r.dateTo,
            });
          }
        }
      });
    });

    const list = Array.from(periodMap.values());

    // Sort alphabetically by name
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    return list.map((p, index) => {
      let nameClean = p.name || `Reporte #${index + 1}`;
      if (/Cubicación/i.test(nameClean)) {
        nameClean = nameClean.replace(/Cubicación\s*#?/gi, "Cub. #");
      }
      return {
        key: `${p.dateFrom}_${p.dateTo}`,
        dateFrom: p.dateFrom,
        dateTo: p.dateTo,
        label: `${nameClean} (${formatDateReadable(p.dateFrom)} al ${formatDateReadable(p.dateTo)})`,
        id: p.id,
      };
    });
  }, [activeSheets]);

  // Master flattened list of every row in every active sheet with calculated values from active report
  const allCalculatedRows = useMemo(() => {
    const list: Array<{
      sheetId: string;
      sheetName: string;
      no: number;
      contractorName: string;
      contractorDoc: string;
      contractorType: string;
      description: string;
      grossValue: number;
      isr: number;
      tss: number;
      pension: number;
      itbis: number;
      warranty: number;
      netPayable: number;
      activity: string;
      subchapter: string;
      dateFrom: string;
      dateTo: string;
      code: string;
      priceUnit: number;
      qty: number;
      unit: string;
      id: string;
      formula?: string;
      grid?: string;
      reportName?: string;
      reportId?: string;
    }> = [];

    activeSheets.forEach((sheet) => {
      // Ensure sheet has reports
      const reps =
        sheet.reports && sheet.reports.length > 0
          ? sheet.reports
          : [
              {
                id: `rep-${sheet.id}-default`,
                name: "Reporte #1",
                dateFrom: sheet.dateFrom || "2026-05-10",
                dateTo: sheet.dateTo || "2026-05-24",
                status: "ABIERTO" as const,
                quantities: {} as Record<string, number>,
                discount1: 0,
                discount2: 0,
              },
            ];

      reps.forEach((rep) => {
        const isClosed = rep.status === "CERRADO";

        const applyIsr = isClosed && rep.savedApplyIsr !== undefined
          ? rep.savedApplyIsr
          : sheet.applyIsr !== false;

        const applyTss = isClosed && rep.savedApplyTss !== undefined
          ? rep.savedApplyTss
          : sheet.applyTss !== false;

        const applyPension = isClosed && rep.savedApplyPension !== undefined
          ? rep.savedApplyPension
          : sheet.applyPension !== false;

        const applyWarranty = isClosed && rep.savedApplyWarranty !== undefined
          ? rep.savedApplyWarranty
          : sheet.applyWarranty !== false;

        const applyItbis = isClosed && rep.savedApplyItbis !== undefined
          ? rep.savedApplyItbis
          : sheet.applyItbis === true;

        const itbisRate = isClosed && rep.savedItbisRate !== undefined
          ? rep.savedItbisRate
          : sheet.itbisRate;

        const overrideParams = isClosed && rep.savedPercentIsr !== undefined
          ? {
              percentIsr: rep.savedPercentIsr,
              percentTss: rep.savedPercentTss,
              percentPension: rep.savedPercentPension,
              percentWarranty: rep.savedPercentWarranty,
              percentItbis: rep.savedPercentItbis,
              isItbisInclusive: rep.savedIsItbisInclusive,
            }
          : undefined;

        sheet.rows.forEach((row) => {
          const actualQty = rep.quantities?.[row.id] ?? 0;

          // Skip if actualQty is 0 to only list items with real production/progress in that report
          if (actualQty <= 0) return;

          const transientRow = {
            ...row,
            quantity: actualQty,
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
            overrideParams,
          );

          list.push({
            sheetId: sheet.id,
            sheetName: sheet.name,
            no: row.no,
            contractorName: calc.contractorName,
            contractorDoc: calc.contractorDoc,
            contractorType: row.unit || calc.row.unit, // unit or contractor type
            description: row.description,
            grossValue: calc.grossValue,
            isr: calc.isr,
            tss: calc.tss,
            pension: calc.pension,
            itbis: calc.itbis,
            warranty: calc.warranty,
            netPayable: calc.netPayable,
            activity: sheet.activity,
            subchapter: row.subchapter || "Primer Nivel",
            dateFrom: rep.dateFrom || sheet.dateFrom,
            dateTo: rep.dateTo || sheet.dateTo,
            code: sheet.code,
            priceUnit: row.priceUnit,
            qty: actualQty,
            unit: row.unit || calc.row.unit || "",
            id: row.id,
            formula: rep.formulas?.[row.id],
            grid: rep.grids?.[row.id],
            reportName: rep.name,
            reportId: rep.id,
          });
        });
      });
    });

    return list;
  }, [activeSheets, contractors, params, includeItbisInNet]);

  // Helper to find the numeric sequence index of a Cubicación based on dates
  const getPeriodNumber = (dateFrom: string, dateTo: string) => {
    const key = `${dateFrom || ""}_${dateTo || ""}`;
    const idx = sortedPeriods.findIndex((p) => p.key === key);
    return idx !== -1 ? idx + 1 : "?";
  };

  // Helper to determine the correct label/abbreviation for report badges
  const getReportBadgeText = (item: {
    activity?: string;
    code?: string;
    sheetName?: string;
    reportName?: string;
    dateFrom: string;
    dateTo: string;
  }) => {
    const num = getPeriodNumber(item.dateFrom, item.dateTo);

    const isWarranty =
      item.activity === "Pago de Retenciones de Garantía" ||
      (item.code && item.code.toUpperCase().startsWith("LIB-")) ||
      (item.sheetName && (
        item.sheetName.toUpperCase().startsWith("LIB-") ||
        item.sheetName.toUpperCase().startsWith("LIBERACIÓN") ||
        item.sheetName.toUpperCase().startsWith("LIBERACION")
      ));

    if (isWarranty) {
      return `Lib. Ret. #${num}`;
    }

    const repName = item.reportName || "";

    if (/Cubicación/i.test(repName) || /^Cub/i.test(repName)) {
      const match = repName.match(/\d+/);
      const n = match ? match[0] : num;
      return `Cub. #${n}`;
    }

    if (/Reporte/i.test(repName) || /^Rep/i.test(repName)) {
      const match = repName.match(/\d+/);
      const n = match ? match[0] : num;
      return `Reporte #${n}`;
    }

    if (repName) {
      return repName;
    }

    return `Reporte #${num}`;
  };

  // Pre-computes accumulated gross, net, occurrences, and period names for each contractor + description
  const accumulatedByPartida = useMemo(() => {
    const map: Record<
      string,
      {
        totalGross: number;
        totalNet: number;
        occurrencesCount: number;
        periodNames: string[];
      }
    > = {};

    allCalculatedRows.forEach((r) => {
      // Group key consistent with contractor identity selection
      const groupKey =
        r.contractorDoc && r.contractorDoc !== "S/D"
          ? r.contractorDoc
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
          : r.contractorName.trim().toLowerCase();

      const descKey = r.description ? r.description.trim().toLowerCase() : "";
      const key = `${groupKey}_${descKey}`;

      const periodKey = `${r.dateFrom || ""}_${r.dateTo || ""}`;
      const pIdx = sortedPeriods.findIndex((p) => p.key === periodKey);
      const pLabel = pIdx !== -1 ? `Reporte #${pIdx + 1}` : r.sheetName;

      if (!map[key]) {
        map[key] = {
          totalGross: 0,
          totalNet: 0,
          occurrencesCount: 0,
          periodNames: [],
        };
      }

      map[key].totalGross += r.grossValue;
      map[key].totalNet += r.netPayable;
      map[key].occurrencesCount += 1;
      if (!map[key].periodNames.includes(pLabel)) {
        map[key].periodNames.push(pLabel);
      }
    });

    return map;
  }, [allCalculatedRows, sortedPeriods]);

  // Apply Search Filtering on detailed records
  const filteredRows = useMemo(() => {
    return allCalculatedRows.filter((r) => {
      const text =
        `${r.contractorName} ${r.contractorDoc} ${r.description} ${r.activity} ${r.sheetId} ${r.subchapter}`.toLowerCase();
      return text.includes(searchTerm.toLowerCase());
    });
  }, [allCalculatedRows, searchTerm]);

  // Grouped by Contractor aggregates
  const groupedByContractor = useMemo(() => {
    const map: {
      [key: string]: {
        name: string;
        doc: string;
        key: string;
        // All tasks found on search (Screen view)
        allScreenItems: typeof allCalculatedRows;
        screenTotalGross: number;
        screenTotalIsr: number;
        screenTotalTss: number;
        screenTotalPension: number;
        screenTotalItbis: number;
        screenTotalWarranty: number;
        screenTotalNet: number;

        // Tasks filtered by the selected period (Printed view)
        printableItems: typeof allCalculatedRows;
        printTotalGross: number;
        printTotalIsr: number;
        printTotalTss: number;
        printTotalPension: number;
        printTotalItbis: number;
        printTotalWarranty: number;
        printTotalNet: number;

        printTotalAdvance: number;
        printTotalDiscount1: number;
        printTotalDiscount2: number;
        printTotalDiscounts: number;
      };
    } = {};

    filteredRows.forEach((r) => {
      // Group by normalized document (identity). Fallback to name if S/D.
      const groupKey =
        r.contractorDoc && r.contractorDoc !== "S/D"
          ? r.contractorDoc
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
          : r.contractorName.trim().toLowerCase();

      if (!map[groupKey]) {
        map[groupKey] = {
          name: r.contractorName,
          doc: r.contractorDoc,
          key: groupKey,
          allScreenItems: [],
          screenTotalGross: 0,
          screenTotalIsr: 0,
          screenTotalTss: 0,
          screenTotalPension: 0,
          screenTotalItbis: 0,
          screenTotalWarranty: 0,
          screenTotalNet: 0,

          printableItems: [],
          printTotalGross: 0,
          printTotalIsr: 0,
          printTotalTss: 0,
          printTotalPension: 0,
          printTotalItbis: 0,
          printTotalWarranty: 0,
          printTotalNet: 0,

          printTotalAdvance: 0,
          printTotalDiscount1: 0,
          printTotalDiscount2: 0,
          printTotalDiscounts: 0,
        };
      }

      const g = map[groupKey];
      // 1. Add to always visible screen items lists
      g.allScreenItems.push(r);
      g.screenTotalGross += r.grossValue;
      g.screenTotalIsr += r.isr;
      g.screenTotalTss += r.tss;
      g.screenTotalPension += r.pension;
      g.screenTotalItbis += r.itbis;
      g.screenTotalWarranty += r.warranty;
      g.screenTotalNet += r.netPayable;

      // 2. Add to printable filtered lists if it matches selected period
      const itemPeriodKey = `${r.dateFrom}_${r.dateTo}`;
      const matchesPeriod =
        selectedPeriodKey === "all" || itemPeriodKey === selectedPeriodKey;

      if (matchesPeriod) {
        g.printableItems.push(r);
        g.printTotalGross += r.grossValue;
        g.printTotalIsr += r.isr;
        g.printTotalTss += r.tss;
        g.printTotalPension += r.pension;
        g.printTotalItbis += r.itbis;
        g.printTotalWarranty += r.warranty;
        g.printTotalNet += r.netPayable;
      }
    });

    const list = Object.values(map);
    list.forEach((g) => {
      // Find contractor IDs matching this group key
      const contractorIds = contractors
        .filter((c) => {
          const norm =
            c.document && c.document !== "S/D"
              ? c.document
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "")
              : c.name.trim().toLowerCase();
          return norm === g.key;
        })
        .map((c) => c.id);

      let printDiscounts = 0;
      let printAdvance = 0;
      let printDisc1 = 0;
      let printDisc2 = 0;

      activeSheets.forEach((sheet) => {
        if (contractorIds.includes(sheet.contractorId)) {
          const reps = sheet.reports || [];
          reps.forEach((rep) => {
            const itemPeriodKey = `${rep.dateFrom}_${rep.dateTo}`;
            const matchesPeriod =
              selectedPeriodKey === "all" ||
              itemPeriodKey === selectedPeriodKey;
            if (matchesPeriod) {
              const wD = (rep as any).warrantyDeduction || 0;
              printAdvance += rep.advancePayment || 0;
              printDisc1 += rep.discount1 || 0;
              printDisc2 += rep.discount2 || 0;
              printDiscounts += (rep.advancePayment || 0) + (rep.discount1 || 0) + (rep.discount2 || 0) + wD;
            }
          });
        }
      });

      g.printTotalAdvance = printAdvance;
      g.printTotalDiscount1 = printDisc1;
      g.printTotalDiscount2 = printDisc2;
      g.printTotalDiscounts = printDiscounts;

      // Net = Gross - Isr - Tss - Pension - Warranty + Itbis - Discounts
      g.printTotalNet =
        g.printTotalGross -
        g.printTotalIsr -
        g.printTotalTss -
        g.printTotalPension -
        g.printTotalWarranty +
        g.printTotalItbis -
        printDiscounts;
    });

    return list;
  }, [filteredRows, selectedPeriodKey, contractors, activeSheets]);

  // Global consolidated sums
  const globalTotals = useMemo(() => {
    let screenGross = 0,
      screenIsr = 0,
      screenTss = 0,
      screenPension = 0,
      screenItbis = 0,
      screenWarranty = 0,
      screenNet = 0;
    let printGross = 0,
      printIsr = 0,
      printTss = 0,
      printPension = 0,
      printItbis = 0,
      printWarranty = 0,
      printNet = 0;
    let printDiscount1 = 0,
      printDiscount2 = 0,
      printAdvance = 0,
      printDiscounts = 0;

    groupedByContractor.forEach((g) => {
      screenGross += g.screenTotalGross;
      screenIsr += g.screenTotalIsr;
      screenTss += g.screenTotalTss;
      screenPension += g.screenTotalPension;
      screenItbis += g.screenTotalItbis;
      screenWarranty += g.screenTotalWarranty;
      screenNet += g.screenTotalNet;

      printGross += g.printTotalGross;
      printIsr += g.printTotalIsr;
      printTss += g.printTotalTss;
      printPension += g.printTotalPension;
      printItbis += g.printTotalItbis;
      printWarranty += g.printTotalWarranty;
      printNet += g.printTotalNet;

      printAdvance += g.printTotalAdvance || 0;
      printDiscount1 += g.printTotalDiscount1 || 0;
      printDiscount2 += g.printTotalDiscount2 || 0;
      printDiscounts += g.printTotalDiscounts || 0;
    });

    return {
      screen: {
        gross: screenGross,
        isr: screenIsr,
        tss: screenTss,
        pension: screenPension,
        itbis: screenItbis,
        warranty: screenWarranty,
        net: screenNet,
      },
      print: {
        gross: printGross,
        isr: printIsr,
        tss: printTss,
        pension: printPension,
        itbis: printItbis,
        warranty: printWarranty,
        net: printNet,
        advance: printAdvance,
        discount1: printDiscount1,
        discount2: printDiscount2,
        discounts: printDiscounts,
      },
    };
  }, [groupedByContractor]);

  // Helper to translate date keys back into labels
  const activePeriodLabel = useMemo(() => {
    if (selectedPeriodKey === "all") return "Todos los Periodos de Reportes";
    const found = sortedPeriods.find((p) => p.key === selectedPeriodKey);
    return found ? found.label : "Periodo de Reporte Seleccionado";
  }, [selectedPeriodKey, sortedPeriods]);

  const printableReportTitle = useMemo(() => {
    if (selectedPeriodKey === "all") {
      return "RESUMEN GENERAL DE REPORTES (CONSOLIDADO)";
    }
    const found = sortedPeriods.find((p) => p.key === selectedPeriodKey);
    if (found) {
      const nameClean = found.label.split("(")[0].trim().toUpperCase();
      return `RESUMEN DE ${nameClean}`;
    }
    return "RESUMEN - REPORTE DE OBRA SELECCIONADO";
  }, [selectedPeriodKey, sortedPeriods]);

  const printableRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = printableReportTitle;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  // Print preview configuration & warnings calculations for Resumen tab
  const gridInfo = useMemo(() => {
    if (!printWithMeasurements) return { maxCols: 0, maxWidth: 0 };
    let maxCols = 0;
    let maxWidth = 0;
    
    allCalculatedRows.forEach((row) => {
      if (!row.grid) return;
      try {
        const parsed = JSON.parse(row.grid);
        if (parsed && typeof parsed === 'object') {
          const colsCount = parsed.colWidths ? Object.keys(parsed.colWidths).length : (parsed.cols || 0);
          maxCols = Math.max(maxCols, colsCount);
          
          let currentW = 40; // index/row headers
          for (let c = 1; c <= colsCount; c++) {
            const colW = (parsed.colWidths && parsed.colWidths[c]) || 95;
            currentW += colW;
          }
          maxWidth = Math.max(maxWidth, currentW);
        }
      } catch (e) {}
    });
    return { maxCols, maxWidth };
  }, [printWithMeasurements, allCalculatedRows]);

  const exceedsSelectedPaper = useMemo(() => {
    if (!printWithMeasurements) return false;
    let limitW = 1000;
    if (paperSize === "legal") limitW = 1250;
    if (paperSize === "a4") limitW = 1100;
    if (paperSize === "a3") limitW = 1800;
    return gridInfo.maxWidth > limitW;
  }, [printWithMeasurements, paperSize, gridInfo.maxWidth]);

  const suggestedSize = gridInfo.maxWidth > 1200 ? "a3" : (gridInfo.maxWidth > 1000 ? "legal" : "letter");

  const printStyleHTML = `
    @media print {
      @page {
        size: ${paperSize} landscape !important;
        margin: 0.4cm !important;
      }
      /* Hide standard web workspace elements */
      body * {
        visibility: hidden !important;
      }
      /* Show ONLY our printable content container */
      #printable-resumen-modal,
      #printable-resumen-modal * {
        visibility: visible !important;
      }
      #printable-resumen-modal {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0.8cm !important;
        background: white !important;
        color: black !important;
        box-shadow: none !important;
        border: none !important;
        font-size: 10px !important;
      }
      /* Dense grids, tables, breaks and repeated headers */
      tr, .break-inside-avoid {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      thead {
        display: table-header-group !important;
      }
      th {
        padding: 4px 6px !important;
        font-size: 8px !important;
        background-color: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      td {
        padding: 3px 6px !important;
        font-size: 8px !important;
      }
      /* Smaller margins and vertical density */
      .space-y-6 > :not(:first-child) {
        margin-top: 0.75rem !important;
      }
      .p-8, .p-12, .p-4, .p-3.5 {
        padding: 6px !important;
      }
      .pb-5, .pb-4 {
        padding-bottom: 6px !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `;

  return (
    <div id="resumen-tab" className={isFullscreen ? "fixed inset-0 z-[100] bg-slate-50 overflow-auto space-y-6 px-4 py-4 print:p-0 print:bg-white" : "space-y-6 print:bg-white print:p-0"}>
      {/* 1. Filter Control header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Criterio de Consolidación
            </h2>
            <p className="text-xs text-slate-500">
              Verifique histórico de avances. Filtre y descargue reportes
              limpios correspondientes al reporte de corte elegido.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const collapsedMap: Record<string, boolean> = {};
                groupedByContractor.forEach((g) => {
                  const groupKey =
                    g.doc && g.doc !== "S/D"
                      ? g.doc
                          .trim()
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, "")
                      : g.name.trim().toLowerCase();
                  collapsedMap[groupKey] = true;
                });
                setCollapsedContractors(collapsedMap);
              }}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 cursor-pointer transition-all shadow-xs"
              title="Contraer todos los contratistas"
            >
              <EyeOff size={14} className="text-slate-500" />
              <span>Contraer Todos</span>
            </button>

            <button
              onClick={() => {
                setCollapsedContractors({});
              }}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 cursor-pointer transition-all shadow-xs"
              title="Expandir todos los contratistas"
            >
              <Eye size={14} className="text-slate-500" />
              <span>Expandir Todos</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Restaurar tamaño normal" : "Maximizar el área de trabajo de la tabla"}
              className="bg-slate-800 hover:bg-slate-700 hover:text-amber-300 text-slate-200 font-bold text-xs px-3 py-2 rounded-lg border border-slate-700 cursor-pointer transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 size={14} className="text-amber-400 shrink-0" />
                  Restaurar Tamaño
                </>
              ) : (
                <>
                  <Maximize2 size={14} className="text-amber-400 shrink-0" />
                  Pantalla Completa
                </>
              )}
            </button>



            <button
              onClick={() => setShowPrintPreview(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-md whitespace-nowrap"
            >
              <Printer size={14} className="text-blue-100" />
              <span>Vista Previa de Impresión</span>
            </button>
          </div>
        </div>

        {/* Filters blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 items-center">
          {/* Simple badge indicating active view */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-slate-800">
            <Users size={14} className="text-blue-600" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider">
              Por Contratista / Ajustero
            </span>
          </div>

          {/* Period Selection (Combines dates chronologically sequential) */}
          <div className="flex items-center space-x-2 bg-blue-50/50 p-1.5 rounded-lg border border-blue-100">
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-tight pl-1.5 shrink-0">
              Filtrar Rep*:
            </span>
            <select
              value={selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              className="px-2 py-1 bg-white border border-blue-200 text-blue-950 text-xs font-bold rounded-md cursor-pointer focus:outline-hidden w-full"
            >
              <option value="all">Ver todos (Reporte Completo)</option>
              {sortedPeriods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search keyword */}
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={15}
            />
            <input
              type="text"
              placeholder="Filtro rápido de búsqueda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-full border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 1.1 Header Information Ribbon for Screen Mode */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center space-x-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <div>
            <span className="font-bold text-slate-800 block">
              Auditoría de Periodos:{" "}
              <span className="text-blue-700">{activePeriodLabel}</span>
            </span>
            <span className="text-slate-500 text-[11px]">
              La pantalla muestra la cronología total de actividades. Las no
              correspondientes al periodo seleccionado se imprimirán ocultas.
            </span>
          </div>
        </div>

        {/* Global summary badge box */}
        <div className="flex gap-4 items-center bg-white border border-slate-150 px-3 py-1.5 rounded-lg">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase font-mono">
              Neto a Imprimir
            </span>
            <span className="font-mono font-extrabold text-[#0D9488] text-sm">
              {formatCurrencyValue(globalTotals.print.net, params.currency)}
            </span>
          </div>
          <div className="border-l border-slate-200 h-6"></div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase font-mono font-medium">
              Histórico Total
            </span>
            <span className="font-mono font-semibold text-slate-700 text-xs">
              {formatCurrencyValue(globalTotals.screen.net, params.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. PRINT HEADER (Visible only during printing layout) */}
      <div className="hidden print:block space-y-3 mb-6 border-b-2 border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-800 tracking-wider font-mono">
              REPORTE INTEGRAL DE NÓMINA POR CONTRATISTA
            </span>
            <h1 className="text-xl font-bold text-slate-950 uppercase">
              {params.projectName}
            </h1>
            <p className="text-xs text-slate-600 font-semibold">
              {params.companyName} {params.companyRfc ? `| RNC: ${params.companyRfc}` : ""}
            </p>
          </div>
          <div className="text-right font-mono text-[10px] text-slate-600">
            <p>
              <strong>Fecha Reporte:</strong>{" "}
              {new Date().toLocaleDateString("es-DO")}
            </p>
            <p>
              <strong>Corte Seleccionado:</strong>{" "}
              <span className="underline uppercase font-bold text-black">
                {activePeriodLabel}
              </span>
            </p>
            <p>
              <strong>Responsable:</strong> {params.responsible}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-700 italic">
          Cómputo certificado de partidas y retenciones de ley vigentes
          correspondiente al periodo de reporte seleccionado. Las firmas validan
          la liberación de pagos.
        </p>
      </div>

      {/* 3. Screen View Presentation: Contractor Detail Cards containing nested lists */}
      <div className="space-y-6 print:hidden">
        {groupedByContractor.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-400 space-y-2">
            <ListFilter
              size={36}
              className="mx-auto text-slate-300"
              strokeWidth={1.5}
            />
            <p className="text-xs font-semibold">
              No se encontraron renglones de producción que reportar.
            </p>
          </div>
        ) : (
          groupedByContractor.map((g, idx) => {
            const hasPrintableItems = g.printableItems.length > 0;
            const groupKey =
              g.doc && g.doc !== "S/D"
                ? g.doc
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "")
                : g.name.trim().toLowerCase();
            const isCollapsed = !!collapsedContractors[groupKey];

            return (
              <div
                key={`screen-contractor-${idx}`}
                className={`bg-white border rounded-xl shadow-xs overflow-hidden transition-all duration-250 ${
                  hasPrintableItems
                    ? "border-slate-220 hover:border-slate-300"
                    : "border-slate-200 opacity-80"
                }`}
              >
                {/* Header card: Click to Toggle Collapse/Expand */}
                <div
                  onClick={() => {
                    setCollapsedContractors((prev) => ({
                      ...prev,
                      [groupKey]: !prev[groupKey],
                    }));
                  }}
                  className="px-5 py-4 bg-slate-50/50 hover:bg-slate-100/60 border-b border-slate-150 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 uppercase">
                        {g.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-slate-200/50 border border-slate-300 text-slate-600 font-mono text-[10px] font-bold rounded">
                        {g.doc}
                      </span>
                      <span
                        className={`px-2 py-0.5 font-mono text-[9px] font-bold rounded uppercase flex items-center gap-1.5 transition-all ${
                          isCollapsed
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {isCollapsed ? <EyeOff size={11} /> : <Eye size={11} />}
                        <span>
                          {isCollapsed ? "Ver reportes" : "Ocultar reportes"}
                        </span>
                      </span>
                    </div>
                    <p className="text-slate-450 text-[10px] font-mono tracking-wider font-bold">
                      CONTRATISTA AJUSTERO / HISTÓRICO DE EJECUCIONES (Clic para{" "}
                      {isCollapsed ? "abrir" : "cerrar"})
                    </p>
                  </div>

                  {/* Financial Quick Box summaries */}
                  <div className="flex flex-wrap gap-4 text-right items-center">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded px-2.5 py-1 text-right">
                      <span className="text-[9px] text-emerald-700 font-semibold block uppercase font-mono">
                        Neto en Impresión ({g.printableItems.length} acts.)
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-750">
                        {formatCurrencyValue(g.printTotalNet, params.currency)}
                      </span>
                    </div>

                    <div className="bg-slate-100/70 border border-slate-200 rounded px-2.5 py-1 text-right opacity-80">
                      <span className="text-[9px] text-slate-600 font-medium block uppercase font-mono">
                        Monto Histórico Total
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {formatCurrencyValue(g.screenTotalNet, params.currency)}
                      </span>
                    </div>

                    <div className="text-slate-400 pl-1">
                      {isCollapsed ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronUp size={18} />
                      )}
                    </div>
                  </div>
                </div>

                {!isCollapsed && (
                  <>
                    {/* Grid nested list / Table of activities */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-tight font-mono">
                            <th className="px-5 py-2.5">Partida / Origen</th>
                            <th className="px-4 py-2.5">Subcapítulo</th>
                            <th className="px-5 py-2.5">
                              Descripción de Actividad Ejecutada
                            </th>
                            <th className="px-3 py-2.5 text-center">Unidad</th>
                            <th className="px-4 py-2.5 text-right">
                              Valor Bruto ({params.currency})
                            </th>
                            <th className="px-4 py-2.5 text-right font-semibold">
                              Neto a Recibir ({params.currency})
                            </th>
                            <th className="px-5 py-2.5 text-center">
                              Estado Impresión
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {g.allScreenItems.map((item, itemIdx) => {
                            const rowPeriodKey = `${item.dateFrom}_${item.dateTo}`;
                            const isIncludedInPrint =
                              selectedPeriodKey === "all" ||
                              rowPeriodKey === selectedPeriodKey;

                            return (
                              <tr
                                key={`act-${itemIdx}`}
                                className={`transition-all ${
                                  isIncludedInPrint
                                    ? "bg-white hover:bg-slate-50/20"
                                    : "bg-slate-50/60 opacity-55 text-slate-400 line-through decoration-slate-350"
                                }`}
                              >
                                <td className="px-5 py-3">
                                  <div className="font-bold leading-tight flex items-center gap-1.5 flex-wrap">
                                    {onNavigate ? (
                                      <button
                                        onClick={() =>
                                          onNavigate("sheets", item.sheetId)
                                        }
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-extrabold text-left cursor-pointer transition-colors flex items-center gap-0.5"
                                        title="Click para ir directamente a la hoja de producción de esta partida para su edición o revisión"
                                      >
                                        <span>{item.sheetName}</span>
                                        <span className="text-[10px] text-blue-400 font-normal">
                                          ↗
                                        </span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-900 font-bold">
                                        {item.sheetName}
                                      </span>
                                    )}
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                                      {getReportBadgeText(item)}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mt-0.5">
                                    {formatDateReadable(item.dateFrom)} al {formatDateReadable(item.dateTo)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 bg-blue-50/50 border border-blue-200 text-blue-700 font-bold uppercase tracking-wide text-[9px] rounded font-mono">
                                    {item.subchapter}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <p
                                    className={`font-semibold text-slate-900 ${!isIncludedInPrint && "text-slate-400"}`}
                                  >
                                    {item.description}
                                  </p>
                                  {(() => {
                                    const itemGroupKey =
                                      item.contractorDoc &&
                                      item.contractorDoc !== "S/D"
                                        ? item.contractorDoc
                                            .trim()
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]/g, "")
                                        : item.contractorName
                                            .trim()
                                            .toLowerCase();
                                    const descKey = item.description
                                      ? item.description.trim().toLowerCase()
                                      : "";
                                    const key = `${itemGroupKey}_${descKey}`;
                                    const accum = accumulatedByPartida[key] || {
                                      totalGross: item.grossValue,
                                      totalNet: item.netPayable,
                                      occurrencesCount: 1,
                                      periodNames: [],
                                    };

                                    return (
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        <span
                                          className="text-[10px] text-slate-400 font-semibold font-mono uppercase max-w-[200px] truncate"
                                          title={item.activity}
                                        >
                                          {item.activity}
                                        </span>
                                        <span className="text-slate-300">
                                          •
                                        </span>
                                        <span
                                          className="inline-flex items-center bg-blue-50/70 text-blue-850 text-[10px] font-bold border border-blue-200 px-1.5 py-0.5 rounded font-mono uppercase"
                                          title="Monto total bruto pagado para esta partida en el historial general de este contratista"
                                        >
                                          <span>Histórico Partida:</span>
                                          <span className="font-extrabold text-blue-900 ml-1">
                                            {formatCurrencyValue(
                                              accum.totalGross,
                                              params.currency,
                                            )}
                                          </span>
                                        </span>
                                        <span className="text-slate-400 text-[9px] font-medium">
                                          ({accum.occurrencesCount}{" "}
                                          {accum.occurrencesCount === 1
                                            ? "pago"
                                            : "pagos"}
                                          )
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-3 text-center font-mono font-medium">
                                  {item.contractorType}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold font-mono text-slate-700">
                                  {formatCurrencyValue(
                                    item.grossValue,
                                    params.currency,
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-bold font-mono text-slate-950 bg-slate-50/40">
                                  {formatCurrencyValue(
                                    item.netPayable,
                                    params.currency,
                                  )}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  {isIncludedInPrint ? (
                                    <span className="inline-flex items-center space-x-1.5 px-2 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 rounded uppercase font-mono">
                                      <span>●</span>
                                      <span>Sí se Imprime</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1.5 px-2 py-1.5 bg-slate-200 text-slate-500 text-[10px] font-semibold border border-slate-300 rounded uppercase font-mono">
                                      <span>∅</span>
                                      <span>Oculto Filtro</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Sub-computations footer card */}
                    <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-9 gap-4 text-right">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-mono block">
                          PRINT BRUTO
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {formatCurrencyValue(
                            g.printTotalGross,
                            params.currency,
                          )}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-red-500 font-mono block">
                          RET. ISR
                        </span>
                        <span className="font-mono text-xs font-bold text-red-650">
                          {g.printTotalIsr > 0
                            ? `-${formatCurrencyValue(g.printTotalIsr, params.currency)}`
                            : "-"}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-blue-500 font-mono block">
                          RET. TSS
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-600">
                          {g.printTotalTss > 0
                            ? `-${formatCurrencyValue(g.printTotalTss, params.currency)}`
                            : "-"}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-indigo-500 font-mono block font-bold">
                          RET. PENSIONES LEY 6-86
                        </span>
                        <span className="font-mono text-xs font-bold text-indigo-600">
                          {g.printTotalPension > 0
                            ? `-${formatCurrencyValue(g.printTotalPension, params.currency)}`
                            : "-"}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-amber-500 font-mono block">
                          RET. GARANTÍA
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-650">
                          {g.printTotalWarranty > 0
                            ? `-${formatCurrencyValue(g.printTotalWarranty, params.currency)}`
                            : "-"}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-emerald-500 font-mono block">
                          ADIC. ITBIS {has18Itbis ? "(Norma 07-2007)" : ""}
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-600">
                          {g.printTotalItbis > 0
                            ? `+${formatCurrencyValue(g.printTotalItbis, params.currency)}`
                            : "-"}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-500 font-mono block">
                          DESCTOS. VARIOS
                        </span>
                        <span className="font-mono text-xs font-bold text-purple-600">
                          {g.printTotalDiscounts > 0
                            ? `-${formatCurrencyValue(g.printTotalDiscounts, params.currency)}`
                            : "-"}
                        </span>
                      </div>
                      <div className="space-y-0.5 col-span-2 bg-slate-50 border border-slate-300 px-3 py-1 rounded text-right">
                        <span className="text-[9px] text-slate-900 font-mono block font-black uppercase">
                          NETO A IMPRIMIR
                        </span>
                        <span className="font-mono text-sm font-black text-black">
                          {formatCurrencyValue(
                            g.printTotalNet,
                            params.currency,
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. EXCLUSIVE PRINT LAYOUT PRINTING CONTAINER (Separated block per contractor) */}
      <div className="hidden print:block space-y-12">
        {groupedByContractor
          .filter((g) => g.printableItems.length > 0)
          .map((g, idx) => (
            <div
              key={`print-block-${idx}`}
              className="space-y-4 border border-slate-300 p-6 rounded-lg bg-white shadow-none break-inside-avoid print:break-inside-avoid print:page-break-inside-avoid"
              style={{ pageBreakInside: "avoid" }}
            >
              {/* Slip Contractor Details */}
              <div className="pb-3 border-b-2 border-slate-400 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider font-mono uppercase block">
                    COMPROBANTE DE REPORTE EMITIDO
                  </span>
                  <h3 className="text-sm font-bold text-slate-950 uppercase">
                    {g.name}
                  </h3>
                  <p className="font-mono text-[10px] text-slate-600">
                    Documento / Id: <strong>{g.doc}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 rounded text-[9px] font-bold uppercase font-mono tracking-wider">
                    {activePeriodLabel}
                  </span>
                  <p className="text-[9px] text-slate-500 mt-1">
                    Sujeto a deducciones del contrato general
                  </p>
                </div>
              </div>

              {/* Items list */}
              <table className="w-full text-left border-collapse text-[11px] leading-tight border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[9px] font-extrabold text-slate-650 uppercase tracking-tight font-mono border-b border-slate-300">
                    <th className="py-2 px-2 border-r border-slate-200">
                      Hoja Origen
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200">
                      Subcapítulo
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200">
                      Partida Ejecutada / Concepto del Trabajo
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200 text-center w-12">
                      Unidad
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200 text-right w-20">
                      Precio ($)
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200 text-right w-24">
                      Cant. Medida
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200 text-right w-28">
                      Total Bruto
                    </th>
                    <th className="py-2 px-2 text-right w-28">Neto Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {g.printableItems.map((item, iditem) => (
                    <tr key={iditem} className="align-top hover:bg-slate-50/40">
                      <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-[10px] font-semibold text-slate-600">
                        {item.sheetName}{" "}
                        <span className="text-[9px] text-slate-400 block font-normal">
                          ({getReportBadgeText(item)})
                        </span>
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-[9px] uppercase font-bold text-slate-500">
                        {item.subchapter}
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-200 font-medium">
                        <p className="text-slate-900 font-semibold">
                          {item.description}
                        </p>
                        <span className="text-[9px] text-slate-450 italic font-mono uppercase tracking-tight block">
                          ({formatDateReadable(item.dateFrom)} al {formatDateReadable(item.dateTo)})
                        </span>
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-600">
                        {item.unit || item.contractorType}
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-200 text-right font-mono text-slate-700">
                        {formatCurrencyValue(item.priceUnit, params.currency)}
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-200 text-right font-mono font-black text-slate-900">
                        {item.qty}
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-200 text-right font-mono font-black text-slate-900">
                        {formatCurrencyValue(item.grossValue, params.currency)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900">
                        {formatCurrencyValue(item.netPayable, params.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Recibo total figures strip */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-2 md:grid-cols-8 gap-2 text-right text-[10px] font-mono leading-normal">
                <div>
                  <span className="text-[8px] text-slate-400 font-bold block">
                    VALOR BRUTO
                  </span>
                  <span className="font-extrabold text-slate-900 block">
                    {formatCurrencyValue(g.printTotalGross, params.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-red-500 font-bold block">
                    ISR ({params.percentIsr}%)
                  </span>
                  <span className="text-red-750 font-bold block">
                    {g.printTotalIsr > 0
                      ? `-${formatCurrencyValue(g.printTotalIsr, params.currency)}`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-blue-500 font-bold block">
                    TSS ({params.percentTss}%)
                  </span>
                  <span className="text-blue-700 font-bold block">
                    {g.printTotalTss > 0
                      ? `-${formatCurrencyValue(g.printTotalTss, params.currency)}`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-indigo-500 font-bold block">
                    FONDO DE PENSIONES LEY 6-86 ({params.percentPension}%)
                  </span>
                  <span className="text-indigo-700 font-bold block">
                    {g.printTotalPension > 0
                      ? `-${formatCurrencyValue(g.printTotalPension, params.currency)}`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-amber-500 font-bold block">
                    FONDO GARANTÍA
                  </span>
                  <span className="text-amber-700 font-bold block">
                    {g.printTotalWarranty > 0
                      ? `-${formatCurrencyValue(g.printTotalWarranty, params.currency)}`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-emerald-500 font-bold block">
                    ITBIS {has18Itbis ? "(Norma 07-2007)" : ""}
                  </span>
                  <span className="text-emerald-700 font-bold block">
                    {g.printTotalItbis > 0
                      ? `+${formatCurrencyValue(g.printTotalItbis, params.currency)}`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-red-500 font-bold block">
                    ANTICIPOS / AVANCES
                  </span>
                  <span className="text-red-700 font-bold block">
                    {g.printTotalAdvance > 0
                      ? `-${formatCurrencyValue(g.printTotalAdvance, params.currency)}`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-purple-500 font-bold block">
                    DESCTOS. VARIOS
                  </span>
                  <span className="text-purple-700 font-bold block">
                    {g.printTotalDiscount1 + g.printTotalDiscount2 > 0
                      ? `-${formatCurrencyValue(g.printTotalDiscount1 + g.printTotalDiscount2, params.currency)}`
                      : "-"}
                  </span>
                </div>
                <div className="bg-white border border-slate-350 px-2 py-1 rounded text-right">
                  <span className="text-[8px] text-slate-900 font-extrabold block leading-tight">
                    NETO A RECIBIR
                  </span>
                  <span className="text-black text-[11px] font-black block">
                    {formatCurrencyValue(g.printTotalNet, params.currency)}
                  </span>
                </div>
              </div>

              {/* Double sign lines for physical receipts */}
              <div className="grid grid-cols-2 gap-16 pt-8 text-center text-[9px] text-slate-650 max-w-lg mx-auto">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-semibold uppercase font-mono">
                    {g.name}
                  </div>
                  <span>Firma del Ajustero / Recibido Conforme</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-semibold uppercase font-mono">
                    {params.responsible}
                  </div>
                  <span>Firma de Autorización / Supervisor Obra</span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* 5. SIGNATURES CARD Block (Only visible on Printing Layout at the very bottom) */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-12 text-center text-[10px] text-slate-700">
        <div className="space-y-1">
          <div className="border-t border-slate-400 pt-1.5 w-44 mx-auto font-semibold">
            {params.responsible}
          </div>
          <span className="text-slate-400 block font-mono uppercase tracking-wider text-[8px]">
            Supervisor Obra
          </span>
        </div>

        <div className="space-y-1">
          <div className="border-t border-slate-400 pt-1.5 w-44 mx-auto font-semibold">
            Revisado por Auditoría
          </div>
          <span className="text-slate-400 block font-mono uppercase tracking-wider text-[8px]">
            Auditor de Finanzas
          </span>
        </div>

        <div className="space-y-1">
          <div className="border-t border-slate-400 pt-1.5 w-44 mx-auto font-semibold">
            Autorizado Dirección
          </div>
          <span className="text-slate-400 block font-mono uppercase tracking-wider text-[8px]">
            Director de Proyecto
          </span>
        </div>
      </div>
      {/* Interactive Print Preview Modal for Resumen Tab */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center py-6 px-4">
          <style dangerouslySetInnerHTML={{ __html: printStyleHTML }} />

          <div className="relative bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 max-w-[95%] md:max-w-7xl w-full flex flex-col my-auto pointer-events-auto print:my-0 print:border-none print:shadow-none">
            {/* Header Control Panel (no-print) */}
            <div className="no-print px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 rounded-t-xl">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold flex items-center gap-2 font-sans text-white">
                  <Printer size={16} className="text-blue-400" />
                  <span>Vista Previa de Nómina Consolidada</span>
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider font-mono">
                  {selectedPeriodKey === "all"
                    ? "Todos los Periodos"
                    : `CORTE SELECCIONADO: ${activePeriodLabel}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border border-blue-700 shadow-xs"
                >
                  <Printer size={13} />
                  <span>Imprimir Nómina</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-1.5 px-3.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Config Sub-panel (no-print) */}
            <div className="no-print px-6 py-3 bg-[#0b0f19] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors font-bold">
                  <input 
                    type="checkbox" 
                    checked={printWithMeasurements} 
                    onChange={(e) => setPrintWithMeasurements(e.target.checked)} 
                    className="w-3.5 h-3.5 accent-blue-500 rounded bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                  <span>Incluir Soportes de Medición</span>
                </label>
              </div>
              <div className="text-[10px] text-slate-400">
                La impresión detallará cada partida con su soporte.
              </div>
            </div>

            {/* Optional secondary subbar for measurement support settings (no-print) */}
            {printWithMeasurements && (
              <div className="no-print px-6 py-2 bg-[#121929] border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-sans text-slate-300">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-[10px] font-mono uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-semibold text-slate-400">
                    Soportes: Max columnas = {gridInfo.maxCols} (~{gridInfo.maxWidth}px)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400 font-bold">Orientación de página:</span>
                    <strong className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Horizontal (Landscape)
                    </strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Tamaño de Hoja sugerido:</span>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    >
                      <option value="letter">Carta (Letter) - {gridInfo.maxWidth > 1000 ? "⚠️ Estrecho (1000px)" : "Ok"}</option>
                      <option value="legal">Legal (Oficio / Oficio) - 1250px</option>
                      <option value="a4">A4 - 1100px</option>
                      <option value="a3">A3 (Gran Formato) - 1800px</option>
                    </select>
                  </span>
                </div>
                {exceedsSelectedPaper && (
                  <div className="bg-amber-950 border border-amber-800/60 text-[11px] text-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-md shadow-lg animate-pulse">
                    <span className="font-bold">⚠️ ADVERTENCIA: Las mediciones ({gridInfo.maxWidth}px) exceden el papel {paperSize === "letter" ? "Carta" : paperSize === "legal" ? "Legal" : paperSize === "a4" ? "A4" : "A3"}. Cambie a un tamaño mayor (como {suggestedSize.toUpperCase()}) o configure 'Ajustar a la página' en su navegador para evitar recortes.</span>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable container on screen; full size on print */}
            <div
              id="printable-resumen-modal"
              ref={printableRef}
              className="p-8 md:p-12 space-y-8 bg-white overflow-y-auto max-h-[85vh] print:max-h-none print:overflow-visible print:p-0"
            >
              {/* Official Corporate Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-5">
                <div className="flex items-center gap-4">
                  {params.companyLogo && (
                    <img 
                      src={params.companyLogo} 
                      alt="Logo Empresa" 
                      className="h-14 w-auto object-contain max-w-[170px]"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="space-y-1">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase font-sans">
                      {params.companyName || "Constructora Alba & Sánchez S.R.L."}
                    </h1>
                    <p className="text-[11px] text-slate-500 font-bold uppercase font-mono leading-tight">
                      RNC: {params.companyRfc || "1-31-04281-2"}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs space-y-1 w-full sm:w-auto text-slate-700 font-sans min-w-[245px]">
                  <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider font-mono mb-2 border-b border-slate-200 pb-1">
                    Resumen de Reportes de Empresa
                  </div>
                  <div>
                    <strong>Proyecto:</strong>{" "}
                    <span className="text-slate-900 font-bold">
                      {params.projectName}
                    </span>
                  </div>
                  <div>
                    <strong>Corte / Periodo:</strong>{" "}
                    <span className="text-slate-900 font-semibold">
                      {activePeriodLabel}
                    </span>
                  </div>
                  <div>
                    <strong>Fecha de Emisión:</strong>{" "}
                    <span className="font-medium text-slate-900">
                      {new Date().toLocaleDateString("es-DO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Resumen Title & Subtitle for internal consumption */}
              <div className="bg-slate-100 p-4 rounded-lg flex flex-col items-center text-center border border-slate-300">
                <h2 className="text-base font-black text-slate-950 uppercase tracking-widest font-sans">
                  {printableReportTitle}
                </h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono mt-1">
                  ★ Documento Certificado para Consumo Interno de la Empresa ★
                </p>
              </div>

              {/* SECTION 1: CONSOLIDATED GLOBAL TABLE */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-widest font-mono">
                  1. Resumen General Consolidado de Pagos
                </div>
                <table className="w-full text-[10px] text-left border-collapse border border-slate-200 font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[8px] border-b border-slate-200 font-mono">
                      <th className="px-1 py-1 border-r border-slate-200 text-center w-6">
                        No.
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-left">
                        Contratista / Ajustero
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-left w-24 font-mono whitespace-nowrap">
                        Documento
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-right w-20">
                        SBT BRUTO ({params.currency})
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-right w-16">
                        RET. ISR ({params.currency})
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-right w-16">
                        RET. TSS ({params.currency})
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-right w-16">
                        RET. PENSIONES LEY 6-86 ({params.currency})
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-right w-16">
                        RET. GARANTÍA ({params.currency})
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-right w-16">
                        ADIC. ITBIS {has18Itbis ? "(Norma 07-2007)" : ""} ({params.currency})
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-right w-16">
                        ANTICIPOS ({params.currency})
                      </th>
                      <th className="px-2 py-1 border-r border-slate-200 text-right w-16">
                        OTROS DESC. ({params.currency})
                      </th>
                      <th className="px-2 py-1 text-right w-24 bg-slate-50 font-black">
                        NETO A PAGAR ({params.currency})
                      </th>
                      <th className="px-2 py-1 text-left w-36 border-l border-slate-200">
                        Observaciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {groupedByContractor.filter(
                      (g) => g.printableItems.length > 0 || g.printTotalDiscounts > 0 || g.printTotalAdvance > 0,
                    ).length === 0 ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="text-center py-8 text-slate-400 italic"
                        >
                          No se registraron pagos o actividades en el periodo
                          seleccionado.
                        </td>
                      </tr>
                    ) : (
                      groupedByContractor
                        .filter((g) => g.printableItems.length > 0 || g.printTotalDiscounts > 0 || g.printTotalAdvance > 0)
                        .map((g, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 print:bg-transparent"
                          >
                            <td className="px-1 py-1 border-r border-slate-200 text-center font-bold font-mono text-[9px] text-slate-500 bg-slate-50/25">
                              {idx + 1}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 font-bold text-slate-900 uppercase text-[9px] truncate max-w-[120px]">
                              {g.name}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-600 text-[9px] whitespace-nowrap">
                              {g.doc}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-slate-750">
                              {formatCurrencyValue(
                                g.printTotalGross,
                                params.currency,
                              )}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-red-650">
                              {g.printTotalIsr > 0
                                ? `-${formatCurrencyValue(g.printTotalIsr, params.currency)}`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-blue-600">
                              {g.printTotalTss > 0
                                ? `-${formatCurrencyValue(g.printTotalTss, params.currency)}`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-indigo-600">
                              {g.printTotalPension > 0
                                ? `-${formatCurrencyValue(g.printTotalPension, params.currency)}`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-amber-750">
                              {g.printTotalWarranty > 0
                                ? `-${formatCurrencyValue(g.printTotalWarranty, params.currency)}`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-emerald-600">
                              {g.printTotalItbis > 0
                                ? `+${formatCurrencyValue(g.printTotalItbis, params.currency)}`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-red-650">
                              {g.printTotalAdvance > 0
                                ? `-${formatCurrencyValue(g.printTotalAdvance, params.currency)}`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-purple-650">
                              {g.printTotalDiscount1 + g.printTotalDiscount2 > 0
                                ? `-${formatCurrencyValue(g.printTotalDiscount1 + g.printTotalDiscount2, params.currency)}`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 text-right font-mono font-black text-slate-950 bg-slate-50/40">
                              {formatCurrencyValue(
                                g.printTotalNet,
                                params.currency,
                              )}
                            </td>
                            <td className="px-2 py-1 border-l border-slate-250 text-left font-sans text-[9px]">
                              <input
                                type="text"
                                value={contractorObservations[g.key] ?? ""}
                                onChange={(e) =>
                                  setContractorObservations((prev) => ({
                                    ...prev,
                                    [g.key]: e.target.value,
                                  }))
                                }
                                placeholder="Escribir nota..."
                                className="no-print w-full bg-slate-50 hover:bg-white border hover:border-slate-300 border-slate-200 rounded px-1.5 py-0.5 text-[9px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                              />
                              <span className="hidden print:block text-[8px] text-slate-700 leading-normal max-w-[120px] break-words">
                                {contractorObservations[g.key] || "-"}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                    {/* Grand Totals Footer Row */}
                    <tr className="bg-slate-100 text-black font-extrabold border-t-2 border-b border-slate-350">
                      <td
                        colSpan={3}
                        className="px-2 py-1.5 text-left uppercase text-[8px] font-mono tracking-wider text-black"
                      >
                        TOTAL GENERAL (NETO A PAGAR):
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-black border-r border-slate-300">
                        {formatCurrencyValue(
                          globalTotals.print.gross,
                          params.currency,
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-bold border-r border-slate-300">
                        {globalTotals.print.isr > 0
                          ? `-${formatCurrencyValue(globalTotals.print.isr, params.currency)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-bold border-r border-slate-300">
                        {globalTotals.print.tss > 0
                          ? `-${formatCurrencyValue(globalTotals.print.tss, params.currency)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-bold border-r border-slate-300">
                        {globalTotals.print.pension > 0
                          ? `-${formatCurrencyValue(globalTotals.print.pension, params.currency)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-bold border-r border-slate-300">
                        {globalTotals.print.warranty > 0
                          ? `-${formatCurrencyValue(globalTotals.print.warranty, params.currency)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-bold border-r border-slate-300">
                        {globalTotals.print.itbis > 0
                          ? `+${formatCurrencyValue(globalTotals.print.itbis, params.currency)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-bold border-r border-slate-300">
                        {globalTotals.print.advance > 0
                          ? `-${formatCurrencyValue(globalTotals.print.advance, params.currency)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-bold border-r border-slate-300">
                        {globalTotals.print.discount1 + globalTotals.print.discount2 > 0
                          ? `-${formatCurrencyValue(globalTotals.print.discount1 + globalTotals.print.discount2, params.currency)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-black font-black text-xs md:text-sm">
                        {formatCurrencyValue(
                          globalTotals.print.net,
                          params.currency,
                        )}
                      </td>
                      <td className="px-2 py-1.5 border-l border-slate-300 bg-slate-100"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION 2: BREAKDOWN PER CONTRACTOR */}
              {includeDetails && (
                <div className="space-y-4 pt-4 border-t border-slate-250 break-before-page">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-widest font-mono">
                    2. Detalle de Actividades & Reporte de Obra
                  </div>

                  {groupedByContractor
                    .filter((g) => g.printableItems.length > 0 || g.printTotalDiscounts > 0 || g.printTotalAdvance > 0)
                    .map((g, idx) => (
                      <div
                        key={idx}
                        className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/20 break-inside-avoid shadow-xs"
                      >
                        <div className="pb-1.5 border-b border-slate-200 flex justify-between items-center text-xs">
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                              {g.name}
                            </h4>
                            <span className="font-mono text-[9px] text-slate-500 font-bold">
                              REG: {g.doc}
                            </span>
                          </div>
                          <div className="text-right font-mono font-bold text-slate-900 text-[11px]">
                            Neto:{" "}
                            {formatCurrencyValue(
                              g.printTotalNet,
                              params.currency,
                            )}
                          </div>
                        </div>

                        <table className="w-full text-left border-collapse text-[10.5px] border border-slate-200">
                          <thead>
                            <tr className="border-b border-slate-200 font-mono text-[8.5px] uppercase text-slate-400 font-extrabold bg-slate-50/50">
                              <th className="py-1 px-1.5 border-r border-slate-200">
                                Origen / Hoja
                              </th>
                              <th className="py-1 px-1.5 border-r border-slate-200">
                                Subcapítulo
                              </th>
                              <th className="py-1 px-1.5 border-r border-slate-200">
                                Descripción de Partida de Obra
                              </th>
                              <th className="py-1 px-1.5 border-r border-slate-200 text-center w-12">
                                Unidad
                              </th>
                              <th className="py-1 px-1.5 border-r border-slate-200 text-right w-24">
                                Precio ({params.currency})
                              </th>
                              <th className="py-1 px-1.5 border-r border-slate-200 text-right w-24">
                                Cant. Medida
                              </th>
                              <th className="py-1 px-1.5 border-r border-slate-200 text-right w-24">
                                Total Bruto ({params.currency})
                              </th>
                              <th className="py-1 px-1.5 text-right w-24">
                                Neto ({params.currency})
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {g.printableItems.map((item, itemIdx) => (
                              <React.Fragment key={itemIdx}>
                                <tr
                                  className="hover:bg-slate-50/20"
                                >
                                  <td className="py-1.5 px-1.5 border-r border-slate-200 font-mono text-[9px] text-slate-500 font-bold">
                                    {item.sheetName}
                                  </td>
                                  <td className="py-1.5 px-1.5 border-r border-slate-200 font-mono text-[8.5px] uppercase text-slate-500">
                                    {item.subchapter}
                                  </td>
                                  <td className="py-1.5 px-1.5 border-r border-slate-200 font-semibold text-slate-800">
                                    {item.description}
                                  </td>
                                  <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-mono text-slate-600 font-bold">
                                    {item.unit || item.contractorType}
                                  </td>
                                  <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono text-slate-750">
                                    {formatCurrencyValue(
                                      item.priceUnit,
                                      params.currency,
                                    )}
                                  </td>
                                  <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono font-black text-slate-900">
                                    {item.qty}
                                  </td>
                                  <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono text-slate-700">
                                    {formatCurrencyValue(
                                      item.grossValue,
                                      params.currency,
                                    )}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-right font-mono font-black text-slate-900">
                                    {formatCurrencyValue(
                                      item.netPayable,
                                      params.currency,
                                    )}
                                  </td>
                                </tr>
                                {printWithMeasurements && (item.formula || item.grid) && (
                                  <tr className="bg-slate-50/50 print:break-inside-avoid border-b border-slate-200">
                                    <td colSpan={8} className="py-2 px-3">
                                      <div className="flex flex-col gap-2">
                                        {item.formula && (
                                           <div className="text-[9px] font-mono flex items-center gap-2">
                                              <span className="text-slate-400 font-bold">Fórmula de apoyo:</span>
                                              <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-bold">
                                                {item.formula}
                                              </span>
                                           </div>
                                        )}
                                        {item.grid && (
                                           <div className="border border-slate-200 rounded-sm overflow-hidden bg-white print:w-full print:max-w-full">
                                              <MeasurementGrid 
                                                initialData={item.grid}
                                                isReadOnly={true}
                                                onChange={() => {}}
                                                uiColor="emerald"
                                                key={`print-grid-resumen-${item.id}`}
                                              />
                                           </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              )}

              {/* OBSERVACIONES DE DETALLES TÉCNICOS */}
              <div className="p-4 bg-slate-50 border border-slate-250 rounded-lg text-[10.5px] leading-relaxed text-slate-800 font-sans break-inside-avoid shadow-xs">
                <span className="font-bold block text-slate-900 text-[10px] uppercase font-mono tracking-wider mb-1">
                  Observaciones / Detalles Técnicos:
                </span>
                <p>
                  Nómina consolidada y reportes físicos de obra validados en su
                  totalidad según las especificaciones técnicas y cubicaciones
                  reales del proyecto. Los pagos están autorizados para su
                  correspondiente trámite de dispersión física.
                </p>
              </div>

              {/* SIGNATURES SECTION (ONLY HECHO BY AND REVISADO BY - CENTERED) */}
              <div className="grid grid-cols-2 gap-4 md:gap-12 pt-14 text-center text-[10.5px] text-slate-800 font-sans break-inside-avoid-page max-w-md md:max-w-xl mx-auto">
                <div className="space-y-1 flex flex-col items-center justify-start">
                  <div className="border-t-2 border-slate-900 pt-2 w-full max-w-[130px] sm:max-w-[180px] mx-auto font-black text-slate-900 uppercase tracking-tight text-[10px]">
                    Hecho por
                  </div>
                  <span className="text-slate-500 block font-mono uppercase tracking-wider text-[8px]">
                    Ingeniero de Obra
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center justify-start">
                  <div className="border-t-2 border-slate-900 pt-2 w-full max-w-[130px] sm:max-w-[180px] mx-auto font-black text-slate-900 uppercase tracking-tight text-[10px]">
                    Revisado por
                  </div>
                  <span className="text-slate-500 block font-mono uppercase tracking-wider text-[8px]">
                    Supervisor
                  </span>
                </div>
              </div>

              {/* Disclaimer / footer note */}
              <p className="text-[9px] text-slate-400 text-center italic pt-4">
                El presente resumen es para consumo interno exclusivo de la
                empresa. Impreso el {new Date().toLocaleString("es-DO")}
              </p>
            </div>

            {/* Footer Control Info Overlay on-screen (no-print) */}
            <div className="no-print bg-slate-50 border-t border-slate-200 px-6 py-4 rounded-b-xl flex justify-between items-center text-[11px] text-slate-500 font-sans">
              <span className="flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500" />
                <span>
                  Formatos listos para impresión física o exportación directa a
                  PDF.
                </span>
              </span>
              <span>
                {params.companyName || "Constructora Alba & Sánchez S.R.L."}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
