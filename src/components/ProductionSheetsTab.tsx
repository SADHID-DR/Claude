/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { MeasurementGrid } from "./MeasurementGrid";
import { Rnd } from "react-rnd";
import {
  ProjectParams,
  Contractor,
  ProductionSheet,
  ProductionRow,
  CalculatedRow,
  ProductionReport,
  formatDateReadable,
  GeneralPriceGuide,
} from "../types";
import { calculateRow, formatCurrencyValue } from "../data";
import {
  Plus,
  Trash2,
  Calendar,
  User,
  Key,
  Activity,
  Sparkles,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Layers,
  HardHat,
  Printer,
  Settings2,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Edit2,
  GripVertical,
  FileText,
  X,
  Calculator,
  Maximize2,
  Minimize2,
  Banknote,
  PenTool,
} from "lucide-react";

interface AutoResizingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
  displayValue?: string | number;
}

const AutoResizingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoResizingTextareaProps
>((({ value, displayValue, defaultValue, onChange, onFocus, onBlur, className, ...props }, ref) => {
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [internalValue, setInternalValue] = useState(value !== undefined ? value : (defaultValue || ""));
  const [isFocused, setIsFocused] = useState(false);

  React.useImperativeHandle(ref, () => localRef.current!);

  const adjustHeight = React.useCallback(() => {
    const textarea = localRef.current;
    if (textarea) {
      textarea.style.height = "0px";
      const scrollHeight = textarea.scrollHeight;
      // Add border width (2px) to prevent scrollbars from appearing when box-sizing is border-box
      textarea.style.height = `${scrollHeight + 2}px`;
    }
  }, []);

  useEffect(() => {
    if (value !== undefined && !isFocused) {
      setInternalValue(value);
    }
  }, [value, isFocused]);

  // Adjust height when internalValue changes
  useEffect(() => {
    adjustHeight();
  }, [internalValue, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
    if (onChange) onChange(e);
    adjustHeight();
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // When not focused and we have a display value, show the display value. Otherwise show the editable internal value.
  const renderedValue = !isFocused && displayValue !== undefined ? String(displayValue) : internalValue;

  return (
    <textarea
      ref={localRef}
      value={renderedValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
}));
AutoResizingTextarea.displayName = "AutoResizingTextarea";

interface ProductionSheetsTabProps {
  activeProjectId: string;
  params: ProjectParams;
  contractors: Contractor[];
  sheets: ProductionSheet[];
  activeSheetId: string | null;
  onUpdateSheet: (updatedSheet: ProductionSheet) => void;
  onAddSheet: (newSheet: ProductionSheet) => void;
  onDeleteSheet: (sheetId: string) => void;
  onSetActiveSheetId: (sheetId: string | null) => void;
  includeItbisInNet: boolean;
  generalPriceGuide?: GeneralPriceGuide;
}

export default function ProductionSheetsTab({
  activeProjectId,
  params,
  contractors,
  sheets,
  activeSheetId,
  onUpdateSheet,
  onAddSheet,
  onDeleteSheet,
  onSetActiveSheetId,
  includeItbisInNet,
  generalPriceGuide,
}: ProductionSheetsTabProps) {
  // --- SHEET/TAB FILTERING AND SORTING STATES ---
  const [tabSearchTerm, setTabSearchTerm] = useState("");
  const [tabSortOrder, setTabSortOrder] = useState<"defecto" | "nombre" | "actividad">("defecto");
  const [tabFilterType, setTabFilterType] = useState<"todos" | "cubicados">("todos");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [selectedReportIdState, setSelectedReportIdState] = useState<
    string | null
  >(null);

  const [measurementSupportState, setMeasurementSupportState] = useState<{rowId: string, type: string} | null>(null);
  const [measurementModalPos, setMeasurementModalPos] = useState({ x: 0, y: 0 });
  const [isDraggingMeasurementModal, setIsDraggingMeasurementModal] = useState(false);
  const dragStartInfo = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  // Determine the target report name of the currently selected report in the active sheet
  const targetReportName = useMemo(() => {
    const rawActiveSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];
    if (!rawActiveSheet) return null;
    const reps = rawActiveSheet.reports || [];
    
    // Check if the selected state id exists
    if (selectedReportIdState) {
      const rep = reps.find(r => r.id === selectedReportIdState);
      if (rep) return rep.name;
    }
    
    // Fall back to the active report logic
    if (rawActiveSheet.activeReportId) {
      const rep = reps.find(r => r.id === rawActiveSheet.activeReportId);
      if (rep) return rep.name;
    }
    
    // Otherwise fallback to last report
    return reps.length > 0 ? reps[reps.length - 1].name : null;
  }, [sheets, activeSheetId, selectedReportIdState]);

  // Helper to find the absolute latest created report name among standard reports
  const latestCreatedReportName = useMemo(() => {
    // Look for a standard (non-warranty) sheet
    const nonWarranty = sheets.find(s => {
      const isWarranty = s.activity === "Pago de Retenciones de Garantía" || (s.code && s.code.startsWith("LIB-")) || (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación")));
      return !isWarranty && s.reports && s.reports.length > 0;
    });
    if (!nonWarranty || !nonWarranty.reports || nonWarranty.reports.length === 0) return null;
    
    // Standard reports are appended in order, so the last one is the latest created
    const sortedReps = [...nonWarranty.reports].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
    return sortedReps[sortedReps.length - 1].name;
  }, [sheets]);

  // Helper to check if a contractor sheet has any measured/cubicada quantities in the absolute latest created report
  const hasCubicadasInLastReport = useCallback((s: ProductionSheet): boolean => {
    const reps = s.reports || [];
    if (reps.length === 0 || !latestCreatedReportName) return false;
    
    const targetRep = reps.find(r => r.name === latestCreatedReportName);
    if (!targetRep) return false;
    
    const quantities = targetRep.quantities || {};
    return s.rows.some((row) => {
      const qty = quantities[row.id];
      return qty !== undefined && qty !== null && qty > 0;
    });
  }, [latestCreatedReportName]);

  const filteredAndSortedSheets = useMemo(() => {
    let result = [...sheets];
    
    // Filter by tab type (default to yellow active ones only)
    if (tabFilterType === "cubicados") {
      result = result.filter((sheet) => hasCubicadasInLastReport(sheet));
    }

    // Filter by search term
    if (tabSearchTerm.trim() !== "") {
      const term = tabSearchTerm.toLowerCase();
      result = result.filter(
        (sheet) =>
          sheet.name.toLowerCase().includes(term) ||
          (sheet.activity && sheet.activity.toLowerCase().includes(term)) ||
          (sheet.supervisor && sheet.supervisor.toLowerCase().includes(term)),
      );
    }
    
    // Sort
    if (tabSortOrder === "nombre") {
      result.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    } else if (tabSortOrder === "actividad") {
      result.sort((a, b) => {
        const activityA = a.activity || "";
        const activityB = b.activity || "";
        return activityA.localeCompare(activityB);
      });
    }
    
    return result;
  }, [sheets, tabSearchTerm, tabSortOrder, tabFilterType, hasCubicadasInLastReport]);

  // New Sheet dialog
  const [showNewSheetModal, setShowNewSheetModal] = useState(false);
  const [newSheetContractorId, setNewSheetContractorId] = useState("");
  const [newSheetCode, setNewSheetCode] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const [newSheetSupervisor, setNewSheetSupervisor] = useState(
    params.responsible,
  );
  const [newSheetActivity, setNewSheetActivity] = useState("");

  // AI Price Agreements Assistant States
  const [isAnalyzingPrices, setIsAnalyzingPrices] = useState(false);
  const [priceAnalysisResult, setPriceAnalysisResult] = useState<string | null>(null);
  const [priceRecommendations, setPriceRecommendations] = useState<any[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isInlineSuggestingRowId, setIsInlineSuggestingRowId] = useState<string | null>(null);

  // Date Helpers for 1-month proposals
  const evaluateMathExpression = (expr: string): number => {
    try {
      const withDots = expr.replace(/,/g, ".");
      const withAsterisks = withDots.replace(/[xX×]/g, "*");
      const sanitized = withAsterisks.replace(/[^\d.+\-*/() ]/g, "");
      if (!sanitized) return 0;
      const finalResult = new Function(`return ${sanitized}`)();
      return isNaN(finalResult) ? 0 : Number(Number(finalResult).toFixed(3));
    } catch {
      return 0;
    }
  };

  const formatQuantity = (val: number | undefined | null): string => {
     if (val === undefined || val === null || val === 0) return "";
     return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(val);
  };

  const formatQuantityDisplay = (val: number | undefined | null): string => {
     if (val === undefined || val === null) return "0";
     return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(val);
  };

  const getNextDayStr = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const d = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    );
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getNextMonthDateStr = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const d = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    );
    d.setMonth(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getClosestSaturday = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const d = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    );
    if (isNaN(d.getTime())) return dateStr;

    const w = d.getDay(); // 0 (Sun) - 6 (Sat)
    let offset = 0;
    if (w <= 2) {
      offset = -(w + 1);
    } else {
      offset = 6 - w;
    }

    d.setDate(d.getDate() + offset);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const get30DaysLaterStr = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const d = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    );
    d.setDate(d.getDate() + 30);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Find global last report dateTo
  const getGlobalLastReportDateTo = (): string | null => {
    let maxTo: string | null = null;
    sheets.forEach((s) => {
      (s.reports || []).forEach((r) => {
        if (r.dateTo) {
          if (!maxTo || r.dateTo.localeCompare(maxTo) > 0) {
            maxTo = r.dateTo;
          }
        }
      });
    });
    return maxTo;
  };

  const getGlobalLastSheetDateTo = (): string | null => {
    let maxTo: string | null = null;
    sheets.forEach((s) => {
      if (s.dateTo) {
        if (!maxTo || s.dateTo.localeCompare(maxTo) > 0) {
          maxTo = s.dateTo;
        }
      }
    });
    return maxTo;
  };

  const getSuggestedDatesForNewSheet = (cid?: string) => {
    let lastCut: string | null = null;
    if (cid) {
      const contractorSheets = sheets.filter((s) => s.contractorId === cid);
      if (contractorSheets.length > 0) {
        contractorSheets.forEach((s) => {
          (s.reports || []).forEach((r) => {
            if (r.dateTo) {
              if (!lastCut || r.dateTo.localeCompare(lastCut) > 0) {
                lastCut = r.dateTo;
              }
            }
          });
        });
        if (!lastCut) {
          contractorSheets.forEach((s) => {
            if (s.dateTo) {
              if (!lastCut || s.dateTo.localeCompare(lastCut) > 0) {
                lastCut = s.dateTo;
              }
            }
          });
        }
      }
    }

    if (!lastCut) {
      lastCut = getGlobalLastReportDateTo();
    }
    if (!lastCut) {
      lastCut = getGlobalLastSheetDateTo();
    }
    const baseFrom = lastCut || "2026-05-01";
    const suggestedFrom = baseFrom;
    const suggestedTo = getClosestSaturday(get30DaysLaterStr(suggestedFrom));
    return { from: suggestedFrom, to: suggestedTo };
  };

  const [newSheetError, setNewSheetError] = useState("");

  // Helper to get a unique name and code for a sheet
  const getUniqueSheetNameAndCode = (
    baseName: string,
    baseCode: string,
    excludeId?: string,
  ) => {
    let uniqueName = baseName.trim();
    let uniqueCode = baseCode.trim().toLowerCase().replace(/\s+/g, "_");

    let counter = 1;
    const otherSheets = sheets.filter((s) => s.id !== excludeId);

    while (
      otherSheets.some(
        (s) => s.name.trim().toLowerCase() === uniqueName.toLowerCase(),
      ) ||
      otherSheets.some((s) => s.id === uniqueCode)
    ) {
      counter++;
      if (baseName.includes("(") && baseName.endsWith(")")) {
        const lastIndex = baseName.lastIndexOf("(");
        const main = baseName.substring(0, lastIndex).trim();
        const spec = baseName
          .substring(lastIndex + 1, baseName.length - 1)
          .trim();
        uniqueName = `${main} (${spec} ${counter})`;
      } else {
        uniqueName = `${baseName} ${counter}`;
      }
      uniqueCode = `${baseCode}_${counter}`.toLowerCase().replace(/\s+/g, "_");
    }
    return { uniqueName, uniqueCode };
  };

  // Quick edit mode for sheet headers
  const [isEditingHeader, setIsEditingHeader] = useState(false);

  // Local edit states for header
  const [draftContractorId, setDraftContractorId] = useState("");
  const [draftSupervisor, setDraftSupervisor] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftActivity, setDraftActivity] = useState("");
  const [headerEditError, setHeaderEditError] = useState("");

  // Custom alert and confirm states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // --- DRAG AND DROP ACTIVITIES STATE ---
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [dragOverSubchapter, setDragOverSubchapter] = useState<string | null>(
    null,
  );
  const [canDragRowId, setCanDragRowId] = useState<string | null>(null);

  // --- DRAG AND DROP SUBCHAPTERS STATE ---
  const [draggingSubchapter, setDraggingSubchapter] = useState<string | null>(null);
  const [dragOverSubchapterMoveTarget, setDragOverSubchapterMoveTarget] = useState<string | null>(null);
  const [canDragSubchapter, setCanDragSubchapter] = useState<string | null>(null);

  // --- CUBICACIONES ACUMULADAS ENGINES & STATES ---
  const [viewMode, setViewMode] = useState<"actual" | "historico">("actual");
  const [hideNoMovement, setHideNoMovement] = useState(false);
  const [isInternalCopy, setIsInternalCopy] = useState(false);
  const [voucherPrintMode, setVoucherPrintMode] = useState<"contractor" | "company" | "both">("contractor");
  const [printWithMeasurements, setPrintWithMeasurements] = useState(false);
  const [paperSize, setPaperSize] = useState<"letter" | "legal" | "a4" | "a3">("letter");

  // --- PU CHANGE CONFIRMATION STATES ---
  const [showPUWarningModal, setShowPUWarningModal] = useState(false);
  const [pendingPuChange, setPendingPuChange] = useState<{
    rowId: string;
    value: number;
  } | null>(null);

  // --- NEW REPORT CONFIGURATION STATES ---
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [newRepName, setNewRepName] = useState("");
  const [newRepId, setNewRepId] = useState("");
  const [newRepFrom, setNewRepFrom] = useState("");
  const [newRepTo, setNewRepTo] = useState("");
  const [isExtraordinary, setIsExtraordinary] = useState(false);
  const [parentReportId, setParentReportId] = useState("");

  // --- SIGNATURE CLOSE MODAL STATES ---
  const [showSignatureCloseModal, setShowSignatureCloseModal] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [loadedDefaultSignature, setLoadedDefaultSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);


  // --- EDIT REPORT CONFIGURATION STATES ---
  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [editRepName, setEditRepName] = useState("");
  const [editRepFrom, setEditRepFrom] = useState("");
  const [editRepTo, setEditRepTo] = useState("");
  const [editRepError, setEditRepError] = useState("");
  const [showDeleteReportConfirm, setShowDeleteReportConfirm] = useState(false);
  const [deleteReportPassword, setDeleteReportPassword] = useState("");
  const [deleteReportPasswordError, setDeleteReportPasswordError] =
    useState("");
  const [deleteSheetPassword, setDeleteSheetPassword] = useState("");
  const [deleteSheetPasswordError, setDeleteSheetPasswordError] = useState("");

  // --- WARRANTY RELEASE MODAL ---
  const [showWarrantyReleaseModal, setShowWarrantyReleaseModal] = useState(false);
  const [warrantyReleaseContractorId, setWarrantyReleaseContractorId] = useState("");
  const [warrantyTotalRetained, setWarrantyTotalRetained] = useState(0);
  const [warrantyAlreadyReleased, setWarrantyAlreadyReleased] = useState(0);
  const [warrantyReleaseAmountInput, setWarrantyReleaseAmountInput] = useState("");

  const printableRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Comprobante_${activeSheetId}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  // --- SUBCHAPTER/CAPITULO MANAGEMENT STATES ---
  const [showCreateSubchapterModal, setShowCreateSubchapterModal] = useState(false);
  const [showEditSubchapterModal, setShowEditSubchapterModal] = useState(false);
  const [editingSubchapterName, setEditingSubchapterName] = useState<string | null>(null);
  const [newSubchapterDraft, setNewSubchapterDraft] = useState("");

  // Normalization of active sheet - ensures it always has reports list for backwards compatibility
  const sheetWithReports = useMemo<ProductionSheet>(() => {
    const rawSheet =
      sheets.find((s) => s.id === activeSheetId) || sheets[0] || null;
    if (!rawSheet) {
      return {
        id: "dummy",
        name: "Dummy",
        supervisor: "",
        code: "",
        activity: "",
        rows: [],
      };
    }

    if (rawSheet.reports && rawSheet.reports.length > 0) {
      return rawSheet;
    }

    // Auto populate first report with 0 quantities as standard (unlinked from estimated quantity)
    const defaultQuants: Record<string, number> = {};
    rawSheet.rows.forEach((r) => {
      defaultQuants[r.id] = 0;
    });

    const defaultRep = {
      id: "rep-1",
      name: "Reporte #1",
      dateFrom: "2026-05-10",
      dateTo: "2026-05-24",
      status: "ABIERTO" as const,
      quantities: defaultQuants,
      discount1: 0,
      discount1Label: "Descuento #1",
      discount2: 0,
      discount2Label: "Descuento #2",
    };

    return {
      ...rawSheet,
      reports: [defaultRep],
      activeReportId: "rep-1",
    };
  }, [sheets, activeSheetId]);

  // Alias activeSheet to the normalized sheetWithReports to avoid breaking any downstream simple references
  const activeSheet = sheetWithReports;

  const activeContractor = useMemo(() => {
    if (!activeSheet || !activeSheet.contractorId) return null;
    return contractors.find((c) => c.id === activeSheet.contractorId) || null;
  }, [activeSheet, contractors]);

  const handleApplyPriceSuggestion = (rowId: string, price: number, unit?: string) => {
    if (!activeSheet) return;
    const updatedRows = activeSheet.rows.map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          priceUnit: price,
          ...(unit ? { unit } : {}),
        };
      }
      return row;
    });

    onUpdateSheet({
      ...activeSheet,
      rows: updatedRows,
    });

    setPriceRecommendations((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const handleAuditPricesWithAI = async () => {
    if (!activeSheet || !activeContractor) return;
    setIsAnalyzingPrices(true);
    setPriceAnalysisResult(null);
    setPriceRecommendations([]);
    setAnalysisError(null);

    const ags = activeContractor.agreements || [];
    const hasCustomAgreements = ags.length > 0;
    const generalGuideText = generalPriceGuide?.content || "";
    const generalGuideFileName = generalPriceGuide?.fileName || "";

    const rowsSubset = activeSheet.rows.map((r) => ({
      id: r.id,
      no: r.no,
      description: r.description,
      quantity: r.quantity,
      unit: r.unit,
      priceUnit: r.priceUnit,
      subchapter: r.subchapter,
    }));

    const systemContextPrompt = `
Tengo una hoja de producción para el contratista "${activeContractor.name}".
La obra activa en este momento es la obra única: "${params.projectName}".

ESTADO DE ACUERDOS DE PRECIOS DEL CONTRATISTA:
${hasCustomAgreements 
  ? `El contratista cuenta con los siguientes ACUERDOS PARTICULARES/ESPECÍFICOS registrados:\n${JSON.stringify(ags, null, 2)}` 
  : `⚠️ El contratista NO cuenta con acuerdos particulares de precios específicos o contratos propios firmados en su expediente.`}

GUÍA DE PRECIOS BASE DE LA EMPRESA GENERAL (FALLBACK / BASELINE CORPORATIVO):
${generalGuideText 
  ? `Esta es la Guía de Precios Base de la Empresa General (se debe usar prioritariamente si el contratista no tiene acuerdos propios, o como referencia secundaria para vacíos en sus acuerdos):\n${generalGuideText}`
  : `No se ha configurado texto específico en la Guía de Precios Base de la Empresa.`}
${generalGuideFileName ? `Documento de Respaldo General Adjunto con el nombre: "${generalGuideFileName}"` : ""}

Renglones actuales en la hoja de producción:
${JSON.stringify(rowsSubset, null, 2)}

Por favor, realiza un análisis minucioso actuando como el Auditor Virtual de Costos. Sigue estas tareas:
1. Revisa si las partidas de la hoja se alinean con las tarifas acordadas en el contrato o acuerdo de precios del contratista para esta obra ("${params.projectName}").
2. Si el contratista tiene acuerdos propios pero una partida no figura en ellos, o si no tiene ningún acuerdo registrado, DEBES comparar y auditar contra la "Guía de Precios Base de la Empresa General". Indícalo de forma clara en cada partida analizada (ej: "Auditado contra la Guía Base de la Empresa").
3. Identifica cualquier discrepancia de precio unitario o unidades (ej: se cargó $180 pero según el acuerdo o guía corresponde $150).
4. Si el contratista no tiene precios acordados específicos para esta obra pero los tiene para otra obra anterior o general, o de lo contrario recurriste a los precios de la empresa, indícalo claramente de forma informativa.

PRESENTA TU RESPUESTA EN DOS PARTES:
Parte 1: Una explicación o resumen en español, profesional, indicando las observaciones, coincidencias y discrepancias encontradas de forma muy legible (usa viñetas o listas). Especifique si cargó/usó la Guía Base corporativa por ausencia de acuerdos previos.
Parte 2: Al final de tu respuesta, de forma obligatoria, incluye las recomendaciones de precio estructuradas en un bloque JSON exacto con la etiqueta \`\`\`json:price_recommendations para automatizar el sistema. El formato debe ser:
\`\`\`json:price_recommendations
[
  {
    "rowId": "ID_DE_LA_PARTIDA",
    "suggestedPrice": 150.00,
    "suggestedUnit": "m2",
    "reason": "Explicación corta indicando si proviene de su acuerdo o de la Guía de Precios Base de la Empresa"
  }
]
\`\`\`
`;

    // Prepare lightweight data variables to avoid sending huge redundant binary base64 files and bloated history
    const leanGeneralPriceGuide = generalPriceGuide ? {
      fileName: generalPriceGuide.fileName,
      mimeType: generalPriceGuide.mimeType,
      content: generalPriceGuide.content,
      updatedAt: generalPriceGuide.updatedAt,
      fileBase64: generalPriceGuide.fileBase64 || null, // keep the file base64 so Gemini has full visual fallback if text is short
    } : undefined;

    const leanContractors = contractors.map(c => ({
      id: c.id,
      name: c.name,
      document: c.document,
      phone: c.phone,
      type: c.type,
      status: c.status,
      bank: c.bank,
      account: c.account,
      email: c.email,
      observations: c.observations,
      agreements: c.agreements?.map(ag => ({
        id: ag.id,
        projectName: ag.projectName,
        fileName: ag.fileName,
        mimeType: ag.mimeType,
        content: ag.content,
        updatedAt: ag.updatedAt,
        fileBase64: c.id === activeContractor.id ? ag.fileBase64 : null, // Keep only for the active contractor to avoid overwhelming payload
      }))
    }));

    const leanSheets = sheets.map(s => ({
      id: s.id,
      name: s.name,
      supervisor: s.supervisor,
      code: s.code,
      activity: s.activity,
      activeReportId: s.activeReportId,
      reports: s.reports ? s.reports.map(rep => ({
        id: rep.id,
        name: rep.name,
        dateFrom: rep.dateFrom,
        dateTo: rep.dateTo,
        status: rep.status
      })) : [],
      // Only serialize the row details for the active sheet to save massive token budgets
      rows: s.id === activeSheet.id ? s.rows.map(r => ({
        id: r.id,
        no: r.no,
        contractorId: r.contractorId,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        priceUnit: r.priceUnit,
        observations: r.observations
      })) : []
    }));

    try {
      const resp = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: systemContextPrompt,
          appState: {
            params,
            contractors: leanContractors,
            sheets: leanSheets,
            generalPriceGuide: leanGeneralPriceGuide,
          },
        }),
      });

      if (!resp.ok) {
        let errMsg = "Error al conectar con el servidor.";
        try {
          const errData = await resp.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch (_) {
          try {
            const txtErr = await resp.text();
            if (txtErr) errMsg = txtErr;
          } catch (__) {}
        }
        throw new Error(errMsg);
      }

      const resData = await resp.json();
      const txt = resData.text || "";
      setPriceAnalysisResult(txt);

      // Parse block json:price_recommendations
      let recs: any[] = [];
      try {
        const blockStart = txt.indexOf("```json:price_recommendations");
        if (blockStart !== -1) {
          const blockEnd = txt.indexOf("```", blockStart + 29);
          if (blockEnd !== -1) {
            const rawJson = txt.substring(blockStart + 29, blockEnd);
            recs = JSON.parse(rawJson);
          }
        }
      } catch (err) {
        console.error("No se pudo parsear el bloque de recomendaciones de precios:", err);
      }
      setPriceRecommendations(recs);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || "Error al conectar con la IA de análisis de precios.");
    } finally {
      setIsAnalyzingPrices(false);
    }
  };

  const handleInlineRowSuggest = async (row: ProductionRow) => {
    if (!activeSheet || !activeContractor) return;
    setIsInlineSuggestingRowId(row.id);

    const ags = activeContractor.agreements || [];
    const hasCustomAgreements = ags.length > 0;
    const generalGuideText = generalPriceGuide?.content || "";

    const prompt = `
Contratista: "${activeContractor.name}"
Obra: "${params.projectName}"

Acuerdos de Precios Específicos del Contratista:
${hasCustomAgreements ? JSON.stringify(ags, null, 2) : "Ninguno (Debe usarse la Guía de Precios Base de la Empresa)"}

Guía de Precios Base de la Empresa General (FALLBACK / CORPORATIVO):
${generalGuideText ? generalGuideText : "No definida"}

Actividad de la partida: "${row.description}"
Unidad actual: "${row.unit}"
Precio actual: ${row.priceUnit}

Por favor, sugiéreme el precio unitario y la unidad exacta que corresponden a esta partida.
Sigue esta prioridad de fuentes:
1. De existir un Acuerdo de Precios Específico del contratista para esta obra o actividad, utilízalo.
2. Si NO tiene acuerdos específicos o si la partida concreta no figura allí, DEBES basarte en la "Guía de Precios Base de la Empresa General".
Responde estrictamente con un objeto JSON en el formato:
{"suggestedPrice": 120, "suggestedUnit": "m2", "reason": "Deducción corta indicando el documento/fuente empleado, ej: según acuerdos específicos del contratista, o según Guía Base de la Empresa"}
`;

    // Prepare lightweight data variables to avoid sending huge redundant binary base64 files and bloated history
    const leanGeneralPriceGuide = generalPriceGuide ? {
      fileName: generalPriceGuide.fileName,
      mimeType: generalPriceGuide.mimeType,
      content: generalPriceGuide.content,
      updatedAt: generalPriceGuide.updatedAt,
      fileBase64: generalPriceGuide.fileBase64 || null, // keep the file base64 so Gemini has full visual fallback if text is short
    } : undefined;

    const leanContractors = contractors.map(c => ({
      id: c.id,
      name: c.name,
      document: c.document,
      phone: c.phone,
      type: c.type,
      status: c.status,
      bank: c.bank,
      account: c.account,
      email: c.email,
      observations: c.observations,
      agreements: c.agreements?.map(ag => ({
        id: ag.id,
        projectName: ag.projectName,
        fileName: ag.fileName,
        mimeType: ag.mimeType,
        content: ag.content,
        updatedAt: ag.updatedAt,
        fileBase64: c.id === activeContractor.id ? ag.fileBase64 : null, // Keep only for user's active contractor
      }))
    }));

    const leanSheets = sheets.map(s => ({
      id: s.id,
      name: s.name,
      supervisor: s.supervisor,
      code: s.code,
      activity: s.activity,
      activeReportId: s.activeReportId,
      reports: s.reports ? s.reports.map(rep => ({
        id: rep.id,
        name: rep.name,
        dateFrom: rep.dateFrom,
        dateTo: rep.dateTo,
        status: rep.status
      })) : [],
      // Only serialize the row details for the active sheet to save massive token budgets
      rows: s.id === activeSheet.id ? s.rows.map(r => ({
        id: r.id,
        no: r.no,
        contractorId: r.contractorId,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        priceUnit: r.priceUnit,
        observations: r.observations
      })) : []
    }));

    try {
      const resp = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          appState: {
            params,
            contractors: leanContractors,
            sheets: leanSheets,
            generalPriceGuide: leanGeneralPriceGuide,
          },
        }),
      });

      if (!resp.ok) {
        let errMsg = "Error al intentar obtener la sugerencia.";
        try {
          const errData = await resp.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch (_) {
          try {
            const txtErr = await resp.text();
            if (txtErr) errMsg = txtErr;
          } catch (__) {}
        }
        throw new Error(errMsg);
      }
      const resData = await resp.json();
      const txt = resData.text || "";

      let jsonMatch = txt.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsedObj = JSON.parse(jsonMatch[0]);
        if (parsedObj && typeof parsedObj.suggestedPrice === "number") {
          handleApplyPriceSuggestion(
            row.id,
            parsedObj.suggestedPrice,
            parsedObj.suggestedUnit,
          );
          alert(
            `¡Sugerencia de Precios IA Aplicada!\n\nDescripción: "${row.description}"\nPrecio sugerido: RD$ ${parsedObj.suggestedPrice}\nUnidad: ${parsedObj.suggestedUnit}\n\nMotivo: ${parsedObj.reason}`,
          );
        }
      } else {
        alert("La IA contestó: " + txt);
      }
    } catch (err: any) {
      alert(`No se pudo obtener una sugerencia de precios para este renglón.\nDetalle: ${err.message || err}`);
    } finally {
      setIsInlineSuggestingRowId(null);
    }
  };

  const selectedReportId = useMemo(() => {
    if (!activeSheet) return null;
    const isWarrantySheet = activeSheet.activity === "Pago de Retenciones de Garantía" || 
                            (activeSheet.code && activeSheet.code.startsWith("LIB-")) || 
                            (activeSheet.name && (activeSheet.name.startsWith("LIB-") || activeSheet.name.startsWith("Liberación")));

    const reps = (activeSheet.reports || []).filter((r) => {
      if (isWarrantySheet) {
        return r.isWarrantyRelease === true;
      } else {
        return r.isWarrantyRelease !== true;
      }
    });

    if (
      selectedReportIdState &&
      reps.some((r) => r.id === selectedReportIdState)
    ) {
      return selectedReportIdState;
    }
    return (activeSheet.activeReportId && reps.some(r => r.id === activeSheet.activeReportId))
      ? activeSheet.activeReportId
      : (reps[reps.length - 1]?.id || null);
  }, [activeSheet, selectedReportIdState]);

  const selectedReport = useMemo(() => {
    if (!activeSheet || !selectedReportId) return null;
    return activeSheet.reports?.find((r) => r.id === selectedReportId) || null;
  }, [activeSheet, selectedReportId]);

  const cascadedSubReportsToDelete = useMemo(() => {
    if (!activeSheet || !selectedReportId || !selectedReport) return [];
    const reportsList = activeSheet.reports || [];
    return reportsList.filter(
      (r) =>
        r.id !== selectedReportId &&
        (r.parentReportId === selectedReportId ||
          (r.parentReportId === undefined &&
            r.name.startsWith(selectedReport.name + "."))),
    );
  }, [activeSheet, selectedReportId, selectedReport]);

  const isReportExtraordinary = (rep?: ProductionReport | null): boolean => {
    if (!rep) return false;
    if (rep.isExtraordinary === true) return true;
    if (rep.parentReportId && rep.parentReportId.trim() !== "") return true;
    return /\b\d+\.\d+\b/.test(rep.name);
  };

  const isLatestReport = useMemo(() => {
    if (!activeSheet || !activeSheet.reports || !selectedReportId || !selectedReport) return false;
    
    // Sort reports for comparison by ID numerically
    const reps = [...activeSheet.reports].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }));
    const currentIdx = reps.findIndex((r) => r.id === selectedReportId);
    if (currentIdx === -1) return false;
    
    if (selectedReport.isWarrantyRelease === true) {
      // For warranty releases, we can only reopen/edit if there's no newer warranty release report
      const hasNewerWarranty = reps.slice(currentIdx + 1).some((r) => r.isWarrantyRelease === true);
      return !hasNewerWarranty;
    } else {
      // A regular report is only blocked if there is a newer regular report (non-WarrantyRelease)
      const hasNewerRegular = reps.slice(currentIdx + 1).some((r) => r.isWarrantyRelease !== true);
      return !hasNewerRegular;
    }
  }, [activeSheet, selectedReportId, selectedReport]);

  // Retrieve prior reports before the currently selected one
  const getPriorReports = (targetRepId: string) => {
    if (!activeSheet.reports) return [];
    const idx = activeSheet.reports.findIndex((r) => r.id === targetRepId);
    if (idx <= 0) return [];
    return activeSheet.reports.slice(0, idx);
  };

  // Helper to get quantities for any row in selectedReportId
  const getRowQuantities = (rowId: string) => {
    const budgetVal =
      activeSheet.rows.find((r) => r.id === rowId)?.quantity ?? 0;

    if (!activeSheet.reports || !selectedReportId) {
      return {
        budget: budgetVal,
        prior: 0,
        actual: 0,
        accum: 0,
        pct: 0,
        isExcess: false,
      };
    }

    const targetIdx = activeSheet.reports.findIndex(
      (r) => r.id === selectedReportId,
    );

    let priorSum = 0;
    const isWarrantySheet = activeSheet.activity === "Pago de Retenciones de Garantía" || 
                            (activeSheet.code && activeSheet.code.startsWith("LIB-")) || 
                            (activeSheet.name && (activeSheet.name.startsWith("LIB-") || activeSheet.name.startsWith("Liberación")));

    for (let i = 0; i < targetIdx; i++) {
      const rep = activeSheet.reports[i];
      const matchType = isWarrantySheet ? rep.isWarrantyRelease === true : rep.isWarrantyRelease !== true;
      if (rep.status === "CERRADO" && matchType) {
        priorSum += rep.quantities[rowId] ?? 0;
      }
    }

    const targetRow = activeSheet.rows.find((x) => x.id === rowId);
    const isRowExtraordinaryLocked =
      isReportExtraordinary(selectedReport) &&
      targetRow &&
      targetRow.createdReportId !== selectedReport?.id &&
      targetRow.createdReportId !== selectedReport?.parentReportId &&
      !!targetRow.createdReportId;
    const actualVal = isRowExtraordinaryLocked
      ? 0
      : (selectedReport?.quantities[rowId] ?? 0);
    const accumVal = priorSum + actualVal;
    const pctVal = budgetVal > 0 ? (accumVal / budgetVal) * 100 : 0;

    return {
      budget: budgetVal,
      prior: priorSum,
      actual: actualVal,
      accum: accumVal,
      pct: pctVal,
      isExcess: accumVal > budgetVal,
    };
  };

  // --- EXCEL COMPARATIVE HISTORICAL SHIELD ---
  const [showHistoryMode, setShowHistoryMode] = useState(false);
  const [collapsedPeriods, setCollapsedPeriods] = useState<
    Record<string, boolean>
  >({});
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const voucherContractorName = useMemo(() => {
    if (!activeSheet) return "";
    const cont = contractors.find((c) => c.id === activeSheet.contractorId);
    return cont ? cont.name : activeSheet.name;
  }, [activeSheet, contractors]);

  const voucherContractorDoc = useMemo(() => {
    if (!activeSheet) return "";
    const cont = contractors.find((c) => c.id === activeSheet.contractorId);
    return cont ? cont.document : "S/D";
  }, [activeSheet, contractors]);

  const voucherContractorType = useMemo(() => {
    if (!activeSheet) return "";
    const cont = contractors.find((c) => c.id === activeSheet.contractorId);
    return cont ? cont.type : "Ajustero de Obra";
  }, [activeSheet, contractors]);

  const voucherContractorPhone = useMemo(() => {
    if (!activeSheet) return "";
    const cont = contractors.find((c) => c.id === activeSheet.contractorId);
    return cont ? cont.phone : "S/D";
  }, [activeSheet, contractors]);

  // Dynamic Lookup of all sheets belonging to the active contractor
  const contractorSheetsSorted = useMemo(() => {
    if (!activeSheet || !activeSheet.contractorId) return [];
    return sheets
      .filter((s) => s.contractorId === activeSheet.contractorId)
      .sort((a, b) => (a.reports?.[0]?.dateFrom || "").localeCompare(b.reports?.[0]?.dateFrom || ""));
  }, [sheets, activeSheet]);

  const togglePeriodCollapse = (periodSheetId: string) => {
    setCollapsedPeriods((prev) => ({
      ...prev,
      [periodSheetId]: !prev[periodSheetId],
    }));
  };

  // Helper to extract stats for a description inside any sheet
  const getRowStatsInSheet = (sheet: ProductionSheet, description: string) => {
    let qty = 0;
    let val = 0;
    if (!description) return { qty, val };
    const cleanDesc = description.trim().toLowerCase();
    const matchingRows = sheet.rows.filter(
      (r) => r.description && r.description.trim().toLowerCase() === cleanDesc,
    );
    matchingRows.forEach((mr) => {
      qty += Number(mr.quantity) || 0;
      val += (Number(mr.quantity) || 0) * (Number(mr.priceUnit) || 0);
    });
    return { qty, val };
  };

  // Helper for accumulated stats
  const getAccumulatedStats = (rowId: string) => {
    let accumQty = 0;
    let accumVal = 0;
    if (!activeSheet) return { qty: 0, val: 0 };
    (activeSheet.reports || []).forEach((r) => {
      const q = r.quantities[rowId] ?? 0;
      accumQty += q;
    });
    const priceUnit =
      activeSheet.rows.find((row) => row.id === rowId)?.priceUnit ?? 0;
    accumVal = accumQty * priceUnit;
    return { qty: accumQty, val: accumVal };
  };

  const totalColumnCount = useMemo(() => {
    if (!showHistoryMode || !activeSheet || !activeSheet.contractorId) {
      let base = 15; // default cumulative columns (15 without subchapter, was 16)
      return base;
    }

    let count = 2; // No, Descripción
    count += 4; // Vista Actual (Cant, Unidad, PriceUnit, Gross)

    (activeSheet.reports || []).forEach((r) => {
      count += !!collapsedPeriods[r.id] ? 1 : 2;
    });

    count += !!collapsedPeriods["acumulado"] ? 1 : 4;
    count += 2; // Observación, Acciones
    return count;
  }, [showHistoryMode, activeSheet, collapsedPeriods, viewMode]);

  const columnsAfterGross = useMemo(() => {
    if (!showHistoryMode || !activeSheet) return 1; // Observación

    let count = 0;
    (activeSheet.reports || []).forEach((r) => {
      count += !!collapsedPeriods[r.id] ? 1 : 2;
    });
    count += !!collapsedPeriods["acumulado"] ? 1 : 4;
    count += 1; // Observación
    return count;
  }, [showHistoryMode, activeSheet, collapsedPeriods]);

  // --- COLUMN RESIZING LOGIC (EXCEL-LIKE) ---
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("mares-col-widths");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem("mares-col-widths", JSON.stringify(colWidths));
    } catch {}
  }, [colWidths]);

  // --- SIGNATURE CLOSE MODAL PERSISTENCE & AUTO-DRAW EFFECT ---
  useEffect(() => {
    if (!showSignatureCloseModal) return;

    // Use a small delay to make sure the canvas is mounted and fully laid out
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width > 0 ? rect.width : 400;
      const h = rect.height > 0 ? rect.height : 176;

      canvas.width = w;
      canvas.height = h;

      const defaultSig = activeSheet?.lastSupervisorSignature || sheets.find(s => s.lastSupervisorSignature)?.lastSupervisorSignature;
      if (defaultSig) {
        const img = new Image();
        img.src = defaultSig;
        img.onload = () => {
          // Clear guide lines if drawing existing signature so it remains clean
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          setHasDrawn(true);
        };
      } else {
        setHasDrawn(false);
      }
    }, 150); // 150ms ensures that CSS animation is complete and client layout size has stabilized

    return () => clearTimeout(timer);
  }, [showSignatureCloseModal, activeSheet, sheets]);

  const triggerAutoFit = () => {
    if (!activeSheet) return;
    const items = visibleRows;

    let maxDescLength = 0;
    let maxObsLength = 0;
    let maxUnitLength = 2;
    let maxPriceLength = 5;

    items.forEach((item) => {
      if (item.description && item.description.length > maxDescLength) {
        maxDescLength = item.description.length;
      }
      if (item.observations && item.observations.length > maxObsLength) {
        maxObsLength = item.observations.length;
      }
      if (item.unit && item.unit.length > maxUnitLength) {
        maxUnitLength = item.unit.length;
      }
      if (item.priceUnit) {
        const pLen = String(item.priceUnit).length;
        if (pLen > maxPriceLength) maxPriceLength = pLen;
      }
    });

    const calculated: Record<string, number> = {};

    calculated["no"] = 35;

    // Default description width based on view mode as shown in the screenshot
    const isHistorical = viewMode === "historico" && activeSheet.contractorId;
    calculated["description"] = isHistorical ? 440 : 380;

    calculated["unid"] = Math.max(40, maxUnitLength * 7 + 10);
    calculated["current-unid"] = Math.max(42, maxUnitLength * 7 + 12);

    const idealPrice = Math.max(68, maxPriceLength * 6.5 + 15);
    calculated["punit"] = idealPrice;
    calculated["current-punit"] = idealPrice;

    calculated["cant-estim"] = 64;
    calculated["cant-anterior"] = 64;
    calculated["cant-actual"] = 68;
    calculated["cant-acum"] = 64;
    calculated["percent-avance"] = 56;

    calculated["current-cant"] = 68;
    calculated["current-valor"] = 80;

    calculated["valor-presup"] = 78;
    calculated["valor-actual"] = 82;
    calculated["valor-acum"] = 78;

    const idealObs = Math.min(250, Math.max(100, maxObsLength * 5.5 + 15));
    calculated["observation"] = idealObs;

    calculated["excess-control"] = 52;
    calculated["actions"] = 55;

    if (activeSheet.reports) {
      activeSheet.reports.forEach((r) => {
        calculated[`rep-${r.id}-cant`] = 68;
        calculated[`rep-${r.id}-valor`] = 80;
        calculated[`rep-${r.id}-collapsed`] = 48;
      });
    }
    calculated["acum-cant"] = 68;
    calculated["acum-pct"] = 56;
    calculated["acum-valor"] = 80;
    calculated["acum-excess"] = 52;
    calculated["acum-collapsed"] = 48;

    setColWidths(calculated);
  };

  useEffect(() => {
    triggerAutoFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSheetId, viewMode]);

  // Auto-detect extraordinary state if user types a decimal name in the New Report Modal
  useEffect(() => {
    if (!showNewReportModal) return;
    const name = newRepName.trim();
    const matchDecimal = name.match(/\b(\d+)\.(\d+)\b/);
    if (matchDecimal) {
      setIsExtraordinary(true);
      if (!parentReportId) {
        const parentNum = matchDecimal[1];
        const reps = activeSheet?.reports || [];
        const foundParent = reps.find(
          (r) =>
            r.name.endsWith(parentNum) ||
            r.name.includes(` ${parentNum}`) ||
            r.name === parentNum ||
            r.name === `Reporte ${parentNum}`,
        );
        if (foundParent) {
          setParentReportId(foundParent.id);
        } else if (reps.length > 0) {
          setParentReportId(reps[0].id);
        }
      }
    }
  }, [newRepName, showNewReportModal, activeSheet]);

  const isAnyModalOpen = 
    measurementSupportState !== null ||
    showNewSheetModal ||
    showWarrantyReleaseModal ||
    showDeleteConfirm ||
    showPUWarningModal ||
    showNewReportModal ||
    showEditReportModal ||
    showDeleteReportConfirm ||
    showCreateSubchapterModal ||
    showEditSubchapterModal ||
    showPrintPreview ||
    validationError !== null;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
      document.querySelectorAll("main, .production-table-container, #production-sheets-tab").forEach(el => (el as HTMLElement).style.overflow = "hidden");
    } else {
      document.body.style.overflow = "";
      document.querySelectorAll("main, .production-table-container, #production-sheets-tab").forEach(el => (el as HTMLElement).style.overflow = "");
    }
    return () => {
      document.body.style.overflow = "";
      document.querySelectorAll("main, .production-table-container, #production-sheets-tab").forEach(el => (el as HTMLElement).style.overflow = "");
    };
  }, [isAnyModalOpen]);

  const handleResizeDoubleClick = (columnId: string) => {
    if (!activeSheet) return;
    const items = visibleRows;

    let optimalWidth = 100;

    if (columnId === "no") {
      optimalWidth = 40;
    } else if (columnId === "description") {
      let maxLength = 10;
      items.forEach((item) => {
        if (item.description && item.description.length > maxLength)
          maxLength = item.description.length;
      });
      optimalWidth = Math.min(700, Math.max(260, maxLength * 7.5 + 40));
    } else if (columnId === "unid" || columnId === "current-unid") {
      let maxLength = 2;
      items.forEach((item) => {
        if (item.unit && item.unit.length > maxLength)
          maxLength = item.unit.length;
      });
      optimalWidth = Math.max(50, maxLength * 9 + 20);
    } else if (columnId === "punit" || columnId === "current-punit") {
      let maxLength = 5;
      items.forEach((item) => {
        const pLen = String(item.priceUnit || 0).length;
        if (pLen > maxLength) maxLength = pLen;
      });
      optimalWidth = Math.max(95, maxLength * 7 + 35);
    } else if (columnId === "observation") {
      let maxLength = 5;
      items.forEach((item) => {
        if (item.observations && item.observations.length > maxLength)
          maxLength = item.observations.length;
      });
      optimalWidth = Math.min(400, Math.max(140, maxLength * 7 + 30));
    } else if (
      columnId.endsWith("-cant") ||
      columnId.endsWith("-actual") ||
      columnId.startsWith("cant-")
    ) {
      optimalWidth = 95;
    } else if (columnId.endsWith("-valor") || columnId.startsWith("valor-")) {
      optimalWidth = 115;
    } else if (columnId === "percent-avance" || columnId === "acum-pct") {
      optimalWidth = 70;
    } else if (columnId === "actions" || columnId === "excess-control" || columnId === "acum-excess") {
      optimalWidth = 65;
    } else {
      optimalWidth = 100;
    }

    setColWidths((prev) => ({
      ...prev,
      [columnId]: optimalWidth,
    }));
  };

  interface TableColumn {
    id: string;
    defaultWidth: number;
  }

  const flatColumns = useMemo<TableColumn[]>(() => {
    if (!activeSheet) return [];

    // Check if showing Comparative Historical View
    const isHistorical = viewMode === "historico" && activeSheet.contractorId;

    if (isHistorical) {
      const list: TableColumn[] = [
        { id: "no", defaultWidth: 40 },
        { id: "actions", defaultWidth: 60 },
        { id: "description", defaultWidth: 480 },
        { id: "current-cant", defaultWidth: 80 },
        { id: "current-unid", defaultWidth: 50 },
        { id: "current-punit", defaultWidth: 90 },
        { id: "current-valor", defaultWidth: 100 },
      ];

      (activeSheet.reports || []).forEach((r) => {
        const isColCollapsed = !!collapsedPeriods[r.id];
        if (isColCollapsed) {
          list.push({ id: `rep-${r.id}-collapsed`, defaultWidth: 60 });
        } else {
          list.push({ id: `rep-${r.id}-cant`, defaultWidth: 80 });
          list.push({ id: `rep-${r.id}-valor`, defaultWidth: 100 });
        }
      });

      const isAcumCollapsed = !!collapsedPeriods["acumulado"];
      if (isAcumCollapsed) {
        list.push({ id: "acum-collapsed", defaultWidth: 60 });
      } else {
        list.push({ id: "acum-cant", defaultWidth: 80 });
        list.push({ id: "acum-pct", defaultWidth: 60 });
        list.push({ id: "acum-valor", defaultWidth: 100 });
        list.push({ id: "acum-excess", defaultWidth: 70 });
      }

      list.push({ id: "observation", defaultWidth: 160 });
      return list;
    } else {
      // Standard Cumulative columns list
      return [
        { id: "no", defaultWidth: 40 },
        { id: "actions", defaultWidth: 60 },
        { id: "description", defaultWidth: 420 },
        { id: "cant-estim", defaultWidth: 80 },
        { id: "cant-anterior", defaultWidth: 80 },
        { id: "cant-actual", defaultWidth: 85 },
        { id: "cant-acum", defaultWidth: 80 },
        { id: "percent-avance", defaultWidth: 60 },
        { id: "unid", defaultWidth: 50 },
        { id: "punit", defaultWidth: 90 },
        { id: "valor-presup", defaultWidth: 100 },
        { id: "valor-actual", defaultWidth: 100 },
        { id: "valor-acum", defaultWidth: 100 },
        { id: "excess-control", defaultWidth: 70 },
        { id: "observation", defaultWidth: 160 },
      ];
    }
  }, [viewMode, activeSheet, collapsedPeriods]);

  const totalTableWidth = useMemo(() => {
    return flatColumns.reduce(
      (sum, col) => sum + (colWidths[col.id] || col.defaultWidth),
      0,
    );
  }, [flatColumns, colWidths]);

  const handleResizeMouseDown = (e: React.MouseEvent | React.TouchEvent, columnId: string) => {
    // Check if it's a touch event or mouse event, ignore if it's a multi-touch
    if ('touches' in e && e.touches.length > 1) return;
    
    // allow panning occasionally? touchAction: "none" is on the handle.
    e.preventDefault();
    e.stopPropagation();

    const startX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const currentColumn = flatColumns.find((c) => c.id === columnId);
    const initialWidth =
      colWidths[columnId] || (currentColumn ? currentColumn.defaultWidth : 100);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      // Prevent default to avoid scrolling when dragging on mobile
      if ('touches' in moveEvent && moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      
      const clientX = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const deltaX = clientX - startX;
      const newWidth = Math.max(30, initialWidth + deltaX);
      setColWidths((prev) => ({
        ...prev,
        [columnId]: newWidth,
      }));
    };

    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove as EventListener);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove as EventListener);
      window.removeEventListener("touchend", handleUp);
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", handleMove as EventListener);
    window.addEventListener("mouseup", handleUp);
    // Add passive: false to touchmove to allow preventing default if needed, though we don't preventDefault in handleMove
    window.addEventListener("touchmove", handleMove as EventListener, { passive: false });
    window.addEventListener("touchend", handleUp);
    document.body.style.cursor = "col-resize";
  };

  const renderResizeHandle = (columnId: string) => (
    <div
      onMouseDown={(e) => handleResizeMouseDown(e, columnId)}
      onTouchStart={(e) => handleResizeMouseDown(e, columnId)}
      onDoubleClick={() => handleResizeDoubleClick(columnId)}
      className="absolute -right-2 top-0 bottom-0 w-4 group-hover:bg-slate-700/55 hover:bg-amber-500/80 active:bg-amber-600 transition-all z-30 cursor-col-resize flex justify-center"
      style={{ touchAction: "none" }}
      title="Arrastrar para cambiar tamaño o Doble Clic para Auto-Ajustar"
    >
      <div className="w-0.5 h-full bg-slate-700/20 group-hover:bg-transparent" />
    </div>
  );

  // Auto-fill form fields when a contractor is selected for a new sheet
  const handleContractorSelectForNewSheet = (cid: string) => {
    setNewSheetContractorId(cid);
    if (!cid) return;
    const cont = contractors.find((c) => c.id === cid);
    if (cont) {
      const firstName = cont.name.trim().split(" ")[0];
      const specialty = cont.type ? cont.type.split("/")[0].trim() : "Ajuste";
      const suggestedName = `${firstName} (${specialty})`;

      // Clean short ID (tab code) eg: "serafin"
      const cleanCode = firstName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

      const uniqueObj = getUniqueSheetNameAndCode(suggestedName, cleanCode);

      setNewSheetCode(uniqueObj.uniqueCode);
      setNewSheetName(uniqueObj.uniqueName);
      setNewSheetActivity(`Reportes generales de ${cont.type}`);
    }
  };

  // Filter row visibility.
  // Work items (rows/partidas) created in the description of work should appear starting from the report/corte they were created in and all subsequent reports.
  // A row with a createdReportId cannot be seen in prior reports.
  const visibleRows = useMemo(() => {
    if (!activeSheet) return [];
    if (!activeSheet.reports || !selectedReportId) return activeSheet.rows;

    const selectedIdx = activeSheet.reports.findIndex((r) => r.id === selectedReportId);
    if (selectedIdx === -1) return activeSheet.rows;

    return activeSheet.rows.filter((row) => {
      if (!row.createdReportId) return true;
      const createdIdx = activeSheet.reports.findIndex((r) => r.id === row.createdReportId);
      if (createdIdx === -1) return true;
      return createdIdx <= selectedIdx;
    });
  }, [activeSheet, selectedReportId]);

  // Get active sheet subchapters list for datalist suggestions
  const existingSubchapters = useMemo(() => {
    const subsSet = new Set<string>();
    if (activeSheet) {
      visibleRows.forEach((r) => {
        if (r.subchapter?.trim()) {
          subsSet.add(r.subchapter.trim());
        }
      });
    }
    if (subsSet.size === 0) {
      subsSet.add("Primer Nivel");
      subsSet.add("Segundo Nivel");
      subsSet.add("Tercer Nivel");
      subsSet.add("Cimentación");
      subsSet.add("Fachada");
    }
    return Array.from(subsSet);
  }, [activeSheet, visibleRows]);

  // Compute live calculations for all rows of the active sheet based on CANT. ACTUAL
  const calculatedRows: CalculatedRow[] = useMemo(() => {
    if (!activeSheet) return [];

    const isClosed = selectedReport?.status === "CERRADO";

    const applyIsr = isClosed && selectedReport.savedApplyIsr !== undefined
      ? selectedReport.savedApplyIsr
      : activeSheet.applyIsr !== false;

    const applyTss = isClosed && selectedReport.savedApplyTss !== undefined
      ? selectedReport.savedApplyTss
      : activeSheet.applyTss !== false;

    const applyPension = isClosed && selectedReport.savedApplyPension !== undefined
      ? selectedReport.savedApplyPension
      : activeSheet.applyPension !== false;

    const applyWarranty = isClosed && selectedReport.savedApplyWarranty !== undefined
      ? selectedReport.savedApplyWarranty
      : activeSheet.applyWarranty !== false;

    const applyItbis = isClosed && selectedReport.savedApplyItbis !== undefined
      ? selectedReport.savedApplyItbis
      : activeSheet.applyItbis === true;

    const itbisRate = isClosed && selectedReport.savedItbisRate !== undefined
      ? selectedReport.savedItbisRate
      : activeSheet.itbisRate;

    const overrideParams = isClosed && selectedReport.savedPercentIsr !== undefined
      ? {
          percentIsr: selectedReport.savedPercentIsr,
          percentTss: selectedReport.savedPercentTss,
          percentPension: selectedReport.savedPercentPension,
          percentWarranty: selectedReport.savedPercentWarranty,
          percentItbis: selectedReport.savedPercentItbis,
          isItbisInclusive: selectedReport.savedIsItbisInclusive,
        }
      : undefined;

    return visibleRows.map((row) => {
      const q = getRowQuantities(row.id);
      // Create a transient row where row.quantity equals CANT. ACTUAL for live calculation purposes only
      const transientRow = {
        ...row,
        quantity: q.actual,
      };
      const calculated = calculateRow(
        transientRow,
        contractors,
        params,
        includeItbisInNet,
        applyIsr,
        applyTss,
        applyPension,
        applyWarranty,
        applyItbis,
        activeSheet.contractorId,
        itbisRate,
        overrideParams
      );
      // Return with original row object restored so that row.quantity (CANT. ESTIMATE) is preserved and editable independently
      return {
        ...calculated,
        row: row,
      };
    });
  }, [
    activeSheet,
    visibleRows,
    contractors,
    params,
    includeItbisInNet,
    selectedReportId,
    selectedReport,
  ]);

  // Group rows for display by Subchapter
  const groupedRows = useMemo(() => {
    const groups: { [key: string]: CalculatedRow[] } = {};
    calculatedRows.forEach((cr) => {
      const sub = cr.row.subchapter?.trim() || "Primer Nivel";
      if (!groups[sub]) {
        groups[sub] = [];
      }
      groups[sub].push(cr);
    });
    return groups;
  }, [calculatedRows]);

  // Map each row ID to a dynamic sequential number (1, 2, 3, 4, 5...) following the grouped display order
  const rowSequentialNoMap = useMemo(() => {
    const map: Record<string, number> = {};
    let seq = 1;
    (Object.values(groupedRows) as CalculatedRow[][]).forEach((list) => {
      list.forEach((cr) => {
        map[cr.row.id] = seq++;
      });
    });
    return map;
  }, [groupedRows]);

  const printableVoucherRows = useMemo(() => {
    if (!activeSheet) return [];
    const mapped = visibleRows
      .map((row) => {
        const qStats = getRowQuantities(row.id);
        const qty = viewMode === "historico" ? qStats.accum : qStats.actual;
        return {
          ...row,
          qty,
          grossValue: qty * row.priceUnit,
        };
      })
      .filter((r) => r.qty > 0);

    // Sort matching the grouped-by-subchapter visual order of the sheet
    return [...mapped].sort((a, b) => {
      const seqA = rowSequentialNoMap[a.id] || 9999;
      const seqB = rowSequentialNoMap[b.id] || 9999;
      return seqA - seqB;
    });
  }, [
    activeSheet,
    visibleRows,
    viewMode,
    selectedReportId,
    selectedReport,
    rowSequentialNoMap,
  ]);

  // Sheet aggregate totals
  const sheetTotals = useMemo(() => {
    let gross = 0;
    let isr = 0;
    let tss = 0;
    let pension = 0;
    let itbis = 0;
    let warranty = 0;
    let net = 0;

    calculatedRows.forEach((cr) => {
      gross += cr.grossValue;
      isr += cr.isr;
      tss += cr.tss;
      pension += cr.pension;
      itbis += cr.itbis;
      warranty += cr.warranty;
      net += cr.netPayable;
    });

    return { gross, isr, tss, pension, itbis, warranty, net };
  }, [calculatedRows]);

  const subtotalActual = useMemo(() => {
    if (!activeSheet || !selectedReport) return 0;
    return visibleRows.reduce((sum, row) => {
      const q = getRowQuantities(row.id).actual;
      return sum + q * row.priceUnit;
    }, 0);
  }, [visibleRows, selectedReport, selectedReportId]);

  const taxDetails = useMemo(() => {
    if (!activeSheet) {
      return {
        subtotal: 0,
        isr: 0,
        tss: 0,
        pension: 0,
        warranty: 0,
        itbis: 0,
        discount1: 0,
        discount2: 0,
        netPayable: 0,
      };
    }

    const isClosed = selectedReport?.status === "CERRADO";

    const effPercentIsr = isClosed && selectedReport.savedPercentIsr !== undefined
      ? selectedReport.savedPercentIsr
      : params.percentIsr;

    const effPercentTss = isClosed && selectedReport.savedPercentTss !== undefined
      ? selectedReport.savedPercentTss
      : params.percentTss;

    const effPercentPension = isClosed && selectedReport.savedPercentPension !== undefined
      ? selectedReport.savedPercentPension
      : params.percentPension;

    const effPercentWarranty = isClosed && selectedReport.savedPercentWarranty !== undefined
      ? selectedReport.savedPercentWarranty
      : params.percentWarranty;

    const effPercentItbis = isClosed && selectedReport.savedPercentItbis !== undefined
      ? selectedReport.savedPercentItbis
      : params.percentItbis;

    const effIsItbisInclusive = isClosed && selectedReport.savedIsItbisInclusive !== undefined
      ? selectedReport.savedIsItbisInclusive
      : params.isItbisInclusive;

    const applyIsr = isClosed && selectedReport.savedApplyIsr !== undefined
      ? selectedReport.savedApplyIsr
      : activeSheet.applyIsr !== false;

    const applyTss = isClosed && selectedReport.savedApplyTss !== undefined
      ? selectedReport.savedApplyTss
      : activeSheet.applyTss !== false;

    const applyPension = isClosed && selectedReport.savedApplyPension !== undefined
      ? selectedReport.savedApplyPension
      : activeSheet.applyPension !== false;

    const applyWarranty = isClosed && selectedReport.savedApplyWarranty !== undefined
      ? selectedReport.savedApplyWarranty
      : activeSheet.applyWarranty !== false;

    const applyItbis = isClosed && selectedReport.savedApplyItbis !== undefined
      ? selectedReport.savedApplyItbis
      : activeSheet.applyItbis === true;

    const sheetItbisRate = isClosed && selectedReport.savedItbisRate !== undefined
      ? selectedReport.savedItbisRate
      : (typeof activeSheet.itbisRate === "number" ? activeSheet.itbisRate : effPercentItbis);

    const isItbisInclusive = effIsItbisInclusive === true;
    const baseSubtotal =
      applyItbis && isItbisInclusive
        ? subtotalActual / (1 + sheetItbisRate / 100)
        : subtotalActual;

    const isrVal = applyIsr ? baseSubtotal * (effPercentIsr / 100) : 0;
    const tssVal = applyTss ? baseSubtotal * (effPercentTss / 100) : 0;
    const pensionVal = applyPension ? baseSubtotal * (effPercentPension / 100) : 0;
    const warrantyVal = applyWarranty ? baseSubtotal * (effPercentWarranty / 100) : 0;

    const itbisVal = applyItbis
      ? isItbisInclusive
        ? subtotalActual - baseSubtotal
        : subtotalActual * (sheetItbisRate / 100)
      : 0;

    const discount1 = selectedReport?.discount1 || 0;
    const discount2 = selectedReport?.discount2 || 0;
    const warrantyDeduction = selectedReport?.warrantyDeduction || 0;
    const advancePayment = selectedReport?.advancePayment || 0;

    let netVal = 0;
    if (isItbisInclusive) {
      netVal = includeItbisInNet
        ? subtotalActual -
          (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2 + warrantyDeduction + advancePayment)
        : baseSubtotal -
          (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2 + warrantyDeduction + advancePayment);
    } else {
      netVal = includeItbisInNet
        ? subtotalActual +
          itbisVal -
          (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2 + warrantyDeduction + advancePayment)
        : subtotalActual -
          (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2 + warrantyDeduction + advancePayment);
    }

    return {
      subtotal: isItbisInclusive ? baseSubtotal : subtotalActual,
      isr: isrVal,
      tss: tssVal,
      pension: pensionVal,
      warranty: warrantyVal,
      itbis: itbisVal,
      discount1,
      discount2,
      warrantyDeduction,
      advancePayment,
      netPayable: netVal,
    };
  }, [subtotalActual, activeSheet, params, selectedReport, includeItbisInNet]);

  const voucherSubtotalVal = useMemo(() => {
    return viewMode === "historico" ? sheetTotals.gross : taxDetails.subtotal;
  }, [viewMode, sheetTotals, taxDetails]);

  const voucherIsrVal = useMemo(() => {
    return viewMode === "historico" ? sheetTotals.isr : taxDetails.isr;
  }, [viewMode, sheetTotals, taxDetails]);

  const voucherTssVal = useMemo(() => {
    return viewMode === "historico" ? sheetTotals.tss : taxDetails.tss;
  }, [viewMode, sheetTotals, taxDetails]);

  const voucherPensionVal = useMemo(() => {
    return viewMode === "historico" ? sheetTotals.pension : taxDetails.pension;
  }, [viewMode, sheetTotals, taxDetails]);

  const voucherWarrantyVal = useMemo(() => {
    return viewMode === "historico"
      ? sheetTotals.warranty
      : taxDetails.warranty;
  }, [viewMode, sheetTotals, taxDetails]);

  const voucherItbisVal = useMemo(() => {
    return viewMode === "historico" ? sheetTotals.itbis : taxDetails.itbis;
  }, [viewMode, sheetTotals, taxDetails]);

  const voucherDiscount1 = useMemo(() => {
    return viewMode === "historico" ? 0 : taxDetails.discount1;
  }, [viewMode, taxDetails]);

  const voucherDiscount2 = useMemo(() => {
    return viewMode === "historico" ? 0 : taxDetails.discount2;
  }, [viewMode, taxDetails]);

  const voucherWarrantyDeduction = useMemo(() => {
    return viewMode === "historico" ? 0 : (taxDetails as any).warrantyDeduction;
  }, [viewMode, taxDetails]);

  const voucherAdvancePayment = useMemo(() => {
    return viewMode === "historico" ? 0 : (taxDetails.advancePayment || 0);
  }, [viewMode, taxDetails]);

  const voucherNetVal = useMemo(() => {
    return viewMode === "historico" ? sheetTotals.net : taxDetails.netPayable;
  }, [viewMode, sheetTotals, taxDetails]);

  const handleDiscountChange = (disId: "discount1" | "discount2" | "advancePayment" | "warrantyDeduction", val: any) => {
    if (!activeSheet || !selectedReport) return;
    if (selectedReport.status === "CERRADO") {
      setValidationError(
        "Este reporte está cerrado y congelado. Use la opción 'Reabrir para Editar' para habilitar cambios si cumple las condiciones.",
      );
      return;
    }
    const num = parseFloat(val) || 0;
    const updated = (activeSheet.reports || []).map((r) => {
      if (r.id === selectedReportId) {
        return { ...r, [disId]: num };
      }
      return r;
    });
    onUpdateSheet({ ...activeSheet, reports: updated });
  };

  const handleDiscountLabelChange = (
    lblId: "discount1Label" | "discount2Label" | "warrantyDeductionLabel",
    text: string,
  ) => {
    if (!activeSheet || !selectedReport) return;
    if (selectedReport.status === "CERRADO") {
      setValidationError(
        "Este reporte está cerrado y congelado. Use la opción 'Reabrir para Editar' para habilitar cambios si cumple las condiciones.",
      );
      return;
    }
    const updated = (activeSheet.reports || []).map((r) => {
      if (r.id === selectedReportId) {
        return { ...r, [lblId]: text };
      }
      return r;
    });
    onUpdateSheet({ ...activeSheet, reports: updated });
  };

  const toggleAuthorizeRow = (rowId: string) => {
    const isRowExtraordinaryLocked =
      isReportExtraordinary(selectedReport) &&
      activeSheet.rows.find((x) => x.id === rowId)?.createdReportId !==
        selectedReport?.id;
    if (isRowExtraordinaryLocked) {
      setValidationError(
        "No se puede autorizar o desautorizar este renglón. En reportes extraordinarios solo se puede modificar partidas creadas exclusivamente para este sub-reporte.",
      );
      return;
    }

    onUpdateSheet({
      ...activeSheet,
      rows: activeSheet.rows.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            authorized: !(r as any).authorized,
          };
        }
        return r;
      }),
    });
  };

  // Identify if any row has excess without authorization
  const rowsInExcessList = useMemo(() => {
    if (!activeSheet) return [];
    return visibleRows.filter((row) => {
      const q = getRowQuantities(row.id);
      return q.isExcess && !(row as any).authorized;
    });
  }, [activeSheet, visibleRows, selectedReportId, selectedReport]);

  const hasExcessBlock = rowsInExcessList.length > 0;

  const handleCloseReport = () => {
    if (!activeSheet || !selectedReport) return;

    // Check for blank activities (descriptions)
    const blankActivityRow = visibleRows.find(
      (row) => !row.description || !row.description.trim(),
    );
    if (blankActivityRow) {
      setValidationError(
        "No se puede cerrar el reporte. Existen partidas o actividades con la descripción en blanco. Por favor, complete la descripción de todas las filas o elimine las vacías.",
      );
      return;
    }

    // Check for blank or zero quantities in the current report (only for rows created in this specific report!)
    const invalidQtyRow = visibleRows.find((row) => {
      if (row.createdReportId !== selectedReportId) return false;
      const q = getRowQuantities(row.id).actual;
      return q === undefined || q === null || q === 0 || isNaN(q);
    });
    if (invalidQtyRow) {
      setValidationError(
        `No se puede cerrar el reporte. El renglón No. ${rowSequentialNoMap[invalidQtyRow.id] || invalidQtyRow.no} ("${invalidQtyRow.description}") tiene una cantidad vacía o en cero en el reporte actual. Por favor registre una cantidad válida mayor a cero o elimine el renglón si no tuvo avance en este periodo.`,
      );
      return;
    }

    if (hasExcessBlock) {
      setValidationError(
        `No se puede cerrar el reporte. Existen ${rowsInExcessList.length} partidas con cantidades en exceso sobre lo presupuestado que requieren la casilla de autorización marcada.`,
      );
      return;
    }

    // Instead of immediately closing, open the Signature Close Modal
    setHasDrawn(false);
    setLoadedDefaultSignature(false);
    setShowSignatureCloseModal(true);
  };

  const handleConfirmCloseWithSignature = (signatureDataUrl: string) => {
    if (!activeSheet || !selectedReport) return;

    const updatedReports = (activeSheet.reports || []).map((r) => {
      if (r.id === selectedReportId) {
        return {
          ...r,
          status: "CERRADO" as const,
          supervisorSignature: signatureDataUrl,
          savedPercentIsr: params.percentIsr,
          savedPercentTss: params.percentTss,
          savedPercentPension: params.percentPension,
          savedPercentWarranty: params.percentWarranty,
          savedPercentItbis: params.percentItbis,
          savedIsItbisInclusive: params.isItbisInclusive,
          savedApplyIsr: activeSheet.applyIsr !== false,
          savedApplyTss: activeSheet.applyTss !== false,
          savedApplyPension: activeSheet.applyPension !== false,
          savedApplyWarranty: activeSheet.applyWarranty !== false,
          savedApplyItbis: activeSheet.applyItbis === true,
          savedItbisRate: activeSheet.itbisRate !== undefined ? activeSheet.itbisRate : params.percentItbis,
        };
      }
      return r;
    });

    onUpdateSheet({
      ...activeSheet,
      reports: updatedReports,
      lastSupervisorSignature: signatureDataUrl,
    });

    setShowSignatureCloseModal(false);

    setValidationError(
      `El corte '${selectedReport.name}' ha sido CERRADO, firmado y congelado exitosamente. Las cantidades registradas se han acumulado de forma permanente.`,
    );
  };

  const handleReopenReport = () => {
    if (!activeSheet || !selectedReport) return;

    if (!isLatestReport) {
      setValidationError(
        "No se puede reabrir ni editar este reporte porque ya se ha creado un corte de pago posterior.",
      );
      return;
    }

    const updatedReports = (activeSheet.reports || []).map((r) => {
      if (r.id === selectedReportId) {
        return {
          ...r,
          status: "ABIERTO" as const,
        };
      }
      return r;
    });

    onUpdateSheet({
      ...activeSheet,
      reports: updatedReports,
    });

    setValidationError(
      `El corte '${selectedReport.name}' ha sido REABIERTO correctamente y habilitado para edición.`,
    );
  };

  const handleSaveEditReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheet || !selectedReportId) return;

    if (!editRepName.trim()) {
      setEditRepError("El nombre del reporte no puede estar vacío.");
      return;
    }
    if (!editRepFrom || !editRepTo) {
      setEditRepError("Las fechas del reporte son obligatorias.");
      return;
    }

    const isWarrantySheet = activeSheet.activity === "Pago de Retenciones de Garantía" || (activeSheet.code && activeSheet.code.startsWith("LIB-")) || (activeSheet.name && (activeSheet.name.startsWith("LIB-") || activeSheet.name.startsWith("Liberación")));
    if (isWarrantySheet) {
      const latestClosedDate = getLatestClosedReportDate();
      if (latestClosedDate && editRepTo <= latestClosedDate) {
        setEditRepError(`La fecha de liberación debe ser posterior al último reporte cerrado (${formatDateReadable(latestClosedDate)}).`);
        return;
      }
    }

    const updatedReports = (activeSheet.reports || []).map((r) => {
      if (r.id === selectedReportId) {
        return {
          ...r,
          name: editRepName.trim(),
          dateFrom: editRepFrom,
          dateTo: editRepTo,
        };
      }
      return r;
    });

    onUpdateSheet({
      ...activeSheet,
      reports: updatedReports,
    });

    setValidationError(
      `El corte ha sido renombrado y actualizado a "${editRepName.trim()}" exitosamente.`,
    );
    setShowEditReportModal(false);
  };

  const validateAdminPassword = (pass: string) => {
    try {
      const savedUsersStr = localStorage.getItem('nom_construction_users_db');
      if (savedUsersStr) {
        const users = JSON.parse(savedUsersStr);
        return users.some((u: any) => u.role === 'admin' && (u.password || '123') === pass);
      }
    } catch(e) {}
    return pass === '123';
  };

  const handleConfirmDeleteReport = () => {
    if (!activeSheet || !selectedReportId || !selectedReport) return;

    // Validate admin password
    if (!validateAdminPassword(deleteReportPassword)) {
      setDeleteReportPasswordError(
        "Clave incorrecta. Ingrese la clave de un Administrador.",
      );
      return;
    }

    const reportsList = activeSheet.reports || [];

    // IDs to delete (the selected report plus all its cascaded sub-reports)
    const idsToDelete = [
      selectedReportId,
      ...cascadedSubReportsToDelete.map((sr) => sr.id),
    ];

    const updatedReports = reportsList.filter(
      (r) => !idsToDelete.includes(r.id),
    );

    if (updatedReports.length === 0) {
      setValidationError(
        "No se puede eliminar el reporte de pago ya que resultaría en una hoja sin reportes. Debe mantener al menos un reporte de pago activo.",
      );
      setShowDeleteReportConfirm(false);
      setShowEditReportModal(false);
      return;
    }

    // 2. Select another report as active & selected
    const newSelectedId = updatedReports[updatedReports.length - 1]?.id || null;

    // 3. Remove any rows specifically created for these deleted reports (extraordinary rows)
    const updatedRows = (activeSheet.rows || []).filter(
      (row) =>
        !row.createdReportId || !idsToDelete.includes(row.createdReportId),
    );

    // 4. Update the sheet
    onUpdateSheet({
      ...activeSheet,
      reports: updatedReports,
      activeReportId: newSelectedId || undefined,
      rows: updatedRows,
    });

    if (newSelectedId) {
      setSelectedReportIdState(newSelectedId);
    }

    const cascadeNames =
      cascadedSubReportsToDelete.length > 0
        ? ` y sus sub-reportes asociados (${cascadedSubReportsToDelete.map((r) => r.name).join(", ")})`
        : "";

    setValidationError(
      `El corte de pago "${selectedReport.name}"${cascadeNames} ha sido eliminado exitosamente junto con todas las partidas/cantidades registradas en ellos.`,
    );
    setShowDeleteReportConfirm(false);
    setShowEditReportModal(false);
  };

  const updateSubreportSuggestions = (parentId: string, reps: any[]) => {
    const pRep = reps.find((r) => r.id === parentId);
    if (!pRep) return;

    const parentName = pRep.name;
    const prefix = parentName + ".";
    const siblingSubreports = reps.filter((r) => r.name.startsWith(prefix));
    let nextSuffix = 1;

    if (siblingSubreports.length > 0) {
      let maxSuffix = 0;
      siblingSubreports.forEach((sr) => {
        const suffixStr = sr.name.substring(prefix.length).trim();
        const parsed = parseFloat(suffixStr);
        if (!isNaN(parsed) && parsed > maxSuffix) {
          maxSuffix = parsed;
        }
      });
      nextSuffix = Math.floor(maxSuffix) + 1;
    }

    setNewRepName(`${prefix}${nextSuffix}`);
    setNewRepFrom(pRep.dateFrom);
    setNewRepTo(pRep.dateTo);
  };

  const handleToggleExtraordinary = (checked: boolean) => {
    setIsExtraordinary(checked);
    const reps = activeSheet?.reports || [];
    if (checked) {
      const defaultParent = reps[reps.length - 1];
      if (defaultParent) {
        setParentReportId(defaultParent.id);
        updateSubreportSuggestions(defaultParent.id, reps);
      }
    } else {
      const nextName = `Reporte #${reps.length + 1}`;
      setNewRepName(nextName);

      let nextFrom = "";
      if (reps.length > 0) {
        let maxTo = reps[0].dateTo;
        reps.forEach((r) => {
          if (r.dateTo && r.dateTo.localeCompare(maxTo) > 0) {
            maxTo = r.dateTo;
          }
        });
        nextFrom = maxTo;
      } else {
        nextFrom = "2026-05-01";
      }
      setNewRepFrom(nextFrom);
      setNewRepTo(getClosestSaturday(get30DaysLaterStr(nextFrom)));
    }
  };

  const handleParentReportChange = (parentId: string) => {
    setParentReportId(parentId);
    const reps = activeSheet?.reports || [];
    updateSubreportSuggestions(parentId, reps);
  };

  const handleCreateNewReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheet) return;

    const count = (activeSheet.reports || []).length;
    const reportName = newRepName.trim() || `Reporte #${count + 1}`;
    const customRepId = newRepId.trim() || `REP-${String(count + 1).padStart(3, '0')}`;
    const reps = activeSheet.reports || [];

    // Verify if ID already exists
    if (reps.find(r => r.id === customRepId)) {
      setValidationError(`El prefijo/ID "${customRepId}" ya existe en esta hoja. Usa uno diferente.`);
      return;
    }

    if (isExtraordinary) {
      if (!parentReportId) {
        setValidationError(
          "Debe seleccionar un reporte principal para vincular su reporte extraordinario.",
        );
        return;
      }
      const parentIdx = reps.findIndex((r) => r.id === parentReportId);
      if (parentIdx !== -1) {
        const subsequentMainReport = reps
          .slice(parentIdx + 1)
          .find((r) => !isReportExtraordinary(r));
        if (subsequentMainReport) {
          setValidationError(
            `No se puede crear el reporte extraordinario "${reportName}" vinculado a "${reps[parentIdx].name}". Ya se ha creado un reporte principal posterior: "${subsequentMainReport.name}". Solamente puede crear reportes extraordinarios para el último reporte principal.`,
          );
          return;
        }
      }
    }

    const newReport: ProductionReport = {
      id: customRepId,
      name: reportName,
      dateFrom: newRepFrom || "2026-06-01",
      dateTo: newRepTo || "2026-06-15",
      status: "ABIERTO" as const,
      quantities: {}, // starts empty (0 movement)
      discount1: 0,
      discount1Label: "Descuento #1",
      discount2: 0,
      discount2Label: "Descuento #2",
      isExtraordinary: isExtraordinary,
      parentReportId: isExtraordinary ? parentReportId : undefined,
    };

    let updatedReports;
    const parentIdx = reps.findIndex((r) => r.id === parentReportId);

    if (isExtraordinary && parentIdx !== -1) {
      const parentName = reps[parentIdx].name;
      const prefix = parentName + ".";
      let insertIdx = parentIdx;
      for (let i = parentIdx + 1; i < reps.length; i++) {
        if (reps[i].name.startsWith(prefix)) {
          insertIdx = i;
        } else {
          break;
        }
      }

      updatedReports = [...reps];
      updatedReports.splice(insertIdx + 1, 0, newReport);
    } else {
      updatedReports = [...reps, newReport];
    }

    onUpdateSheet({
      ...activeSheet,
      reports: updatedReports,
      activeReportId: newReport.id,
    });

    setSelectedReportIdState(newReport.id);
    setShowNewReportModal(false);

    setNewRepName("");
    setNewRepFrom("");
    setNewRepTo("");
    setIsExtraordinary(false);
    setParentReportId("");
  };

  const getLatestClosedReportDate = (): string => {
    let latestDate = "";
    sheets.forEach(s => {
      const isWarrantySheet = s.activity === "Pago de Retenciones de Garantía" || (s.code && s.code.startsWith("LIB-")) || (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación")));
      if (!isWarrantySheet && s.reports) {
        s.reports.forEach(r => {
          if (r.status === "CERRADO" && r.dateTo) {
            if (!latestDate || r.dateTo > latestDate) {
              latestDate = r.dateTo;
            }
          }
        });
      }
    });
    return latestDate;
  };

  const getDefaultWarrantyReleaseDate = (): string => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const latestClosedDate = getLatestClosedReportDate();
    if (!latestClosedDate) {
      return todayStr;
    }
    if (todayStr <= latestClosedDate) {
      try {
        const d = new Date(latestClosedDate + "T12:00:00");
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      } catch (err) {
        return todayStr;
      }
    }
    return todayStr;
  };

  const calculateContractorWarrantyRetained = (contractorId: string) => {
    let totalRetained = 0;
    sheets
      .filter(s => {
        const isWarrantySheet = s.activity === "Pago de Retenciones de Garantía" || (s.code && s.code.startsWith("LIB-")) || (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación")));
        return s.contractorId === contractorId && !isWarrantySheet;
      })
      .forEach(s => {
        const cReports = s.reports || [];
        // If a sheet doesn't have these, fall back to global params.
        const sheetItbisRate = typeof s.itbisRate === "number" ? s.itbisRate : params.percentItbis;
        
        cReports.filter(r => r.status === "CERRADO").forEach(r => {
          let subtotalActual = 0;
          s.rows.forEach(row => {
            const q = r.quantities[row.id] || 0;
            subtotalActual += (q * row.priceUnit);
          });
          
          let baseSubtotal = subtotalActual;
          // In this platform, itbis inclusive is globally defined for reports.
          // The standard tax is calculated relative to params.
          if (params.isItbisInclusive && sheetItbisRate > 0) {
            baseSubtotal = subtotalActual / (1 + (sheetItbisRate / 100));
          }

          const applyWarranty = r.savedApplyWarranty !== undefined ? r.savedApplyWarranty : s.applyWarranty !== false;
          const effPercentWarranty = r.savedPercentWarranty ?? params.percentWarranty;
          
          if (applyWarranty) {
             totalRetained += (baseSubtotal * effPercentWarranty) / 100;
          }
        });
      });
    return totalRetained;
  };

  const calculateContractorWarrantyReleased = (contractorId: string, onlyClosed = false) => {
    let totalReleased = 0;
    sheets
      .filter((s) => {
        const isWarrantySheet = s.activity === "Pago de Retenciones de Garantía" || (s.code && s.code.startsWith("LIB-")) || (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación")));
        return s.contractorId === contractorId && isWarrantySheet;
      })
      .forEach((s) => {
        s.rows.forEach((row) => {
          const cReports = s.reports || [];
          cReports.forEach((r) => {
            if (!onlyClosed || r.status === "CERRADO") {
              const q = r.quantities[row.id] || 0;
              totalReleased += q * row.priceUnit;
            }
          });
        });
      });
    return totalReleased;
  };

  const handleCreateWarrantyReleaseSheet = () => {
    if (!warrantyReleaseContractorId) {
      setValidationError("Seleccione un ajustero para calcular retenidos.");
      return;
    }

    const totalRetained = calculateContractorWarrantyRetained(warrantyReleaseContractorId);
    if (totalRetained <= 0) {
      setValidationError("El ajustero seleccionado no tiene fondos retenidos acumulados.");
      return;
    }

    // Calculating what is already locked in closed reports
    const alreadyReleased = calculateContractorWarrantyReleased(warrantyReleaseContractorId, true);
    const remainingToRelease = Math.max(0, totalRetained - alreadyReleased);

    const parsedAmount = Number(warrantyReleaseAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError("Por favor, ingrese un monto de liberación válido mayor a 0.");
      return;
    }

    if (parsedAmount > remainingToRelease + 0.01) {
      setValidationError(`No puede liberar más del balance restante. Máximo disponible: ${remainingToRelease.toFixed(2)}`);
      return;
    }

    // Check if there is already an existing warranty release sheet for this contractor
    const existingSheet = sheets.find(
      (s) =>
        s.contractorId === warrantyReleaseContractorId &&
        (s.activity === "Pago de Retenciones de Garantía" ||
          (s.code && s.code.startsWith("LIB-")) ||
          (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación"))))
    );

    if (existingSheet) {
      const existingRow = existingSheet.rows[0];
      if (!existingRow) {
        setValidationError("La hoja de liberación existente está mal estructurada (sin renglones).");
        return;
      }

      // Keep the priceUnit unchanged (totalRetained on initial creation)
      const existingPriceUnit = existingRow.priceUnit || totalRetained || 1;
      const priceUnit = existingPriceUnit > 0 ? existingPriceUnit : 1;

      let updatedReports = [...(existingSheet.reports || [])];
      let activeReportId = existingSheet.activeReportId || (updatedReports[updatedReports.length - 1]?.id);

      // Try to find the active open report in the existing sheet
      let activeRep = updatedReports.find((r) => r.id === activeReportId && r.status === "ABIERTO");
      if (!activeRep) {
        activeRep = updatedReports.find((r) => r.status === "ABIERTO");
      }

      // If no open report exists in the sheet, create a new report period
      if (!activeRep) {
        const nextIndex = updatedReports.length + 1;
        const newRepId = `REP-WAR-00${nextIndex}-${Date.now()}`;
        activeRep = {
          id: newRepId,
          name: `Pago de Retenciones de Garantía #${nextIndex}`,
          dateFrom: getDefaultWarrantyReleaseDate(),
          dateTo: getDefaultWarrantyReleaseDate(),
          status: "ABIERTO",
          isWarrantyRelease: true,
          quantities: {},
          warrantyDeductionLabel: "Deducción por Gastos/Abandono/Reparaciones",
          warrantyDeduction: 0,
          discount1Label: "Otros Descuentos",
          discount1: 0,
          discount2: 0,
        };
        updatedReports.push(activeRep);
        activeReportId = activeRep.id;
      }

      // Express the release amount strictly as a quantity of the existing unit price
      const newQty = Number((parsedAmount / priceUnit).toFixed(6));
      updatedReports = updatedReports.map((r) => {
        if (r.id === activeRep!.id) {
          return {
            ...r,
            quantities: {
              ...(r.quantities || {}),
              [existingRow.id]: newQty,
            },
          };
        }
        return r;
      });

      const updatedSheet: ProductionSheet = {
        ...existingSheet,
        reports: updatedReports,
        activeReportId: activeReportId,
      };

      onUpdateSheet(updatedSheet);
      setShowWarrantyReleaseModal(false);
      onSetActiveSheetId(existingSheet.id);
      setSelectedReportIdState(activeReportId);
    } else {
      // Create new sheet
      const newSheetId = `P-LIB-${Date.now()}`;
      const newRepId = `REP-WAR-001`;

      const cont = contractors.find((c) => c.id === warrantyReleaseContractorId);
      let releaseName = `LIB-${warrantyReleaseContractorId.slice(0, 5)}`;
      let releaseCode = `LIB-${warrantyReleaseContractorId.slice(0, 5)}`;
      if (cont) {
        const firstName = cont.name.trim().split(" ")[0];
        const specialty = cont.type ? cont.type.split("/")[0].trim() : "Ajuste";
        const cleanCode = firstName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        releaseName = `Liberación ${firstName} (${specialty})`;
        releaseCode = `LIB-${cleanCode.substring(0, 8).toUpperCase()}`;
      }

      // Unit price is set permanently as the total retained amount.
      // The partial/total release is expressed strictly in the quantity.
      const initialQty = Number((parsedAmount / totalRetained).toFixed(6));

      const newSheet: ProductionSheet = {
        id: newSheetId,
        name: releaseName,
        code: releaseCode,
        activity: "Pago de Retenciones de Garantía",
        contractorId: warrantyReleaseContractorId,
        supervisor: params.responsible || "General",
        
        applyIsr: false,
        applyTss: false,
        applyPension: false,
        applyWarranty: false,
        applyItbis: false,

        reports: [
          {
            id: newRepId,
            name: "Pago de Retenciones de Garantía",
            dateFrom: getDefaultWarrantyReleaseDate(),
            dateTo: getDefaultWarrantyReleaseDate(),
            status: "ABIERTO",
            isWarrantyRelease: true,
            quantities: {
              [`row-war-${newSheetId}`]: initialQty,
            },
            warrantyDeductionLabel: "Deducción por Gastos/Abandono/Reparaciones",
            warrantyDeduction: 0,
            discount1Label: "Otros Descuentos",
            discount1: 0,
            discount2: 0,
          }
        ],
        rows: [
          {
            id: `row-war-${newSheetId}`,
            no: 1,
            contractorId: warrantyReleaseContractorId,
            description: "PAGO POR LIBERACIÓN DE RETENCIONES DE GARANTÍA (ACUMULADAS AL CIERRE)",
            quantity: 1, 
            unit: "P.A.",
            priceUnit: totalRetained,
            observations: "",
            subchapter: "GENERAL",
            createdReportId: newRepId,
          }
        ]
      };

      onAddSheet(newSheet);
      setShowWarrantyReleaseModal(false);
      onSetActiveSheetId(newSheetId);
      setSelectedReportIdState(newRepId);
    }
  };

  // Handle Updates to Specific Cells in a Row supporting Reports
  const handleCellChangeCustom = (rowId: string, field: string, value: any, formula?: string, gridJson?: string): boolean => {
    if (!activeSheet) return false;

    if (field === "quantityActual") {
      if (selectedReport?.status === "CERRADO") {
        setValidationError(
          "Este reporte está cerrado y congelado. Use la opción 'Reabrir para Editar' para habilitar cambios si cumple las condiciones.",
        );
        return false;
      }

      const targetRow = activeSheet.rows.find((x) => x.id === rowId);
      const numVal = parseFloat(value) || 0;

      if (targetRow && isReportExtraordinary(selectedReport)) {
        // Evaluate if this row is editable for actual quantity under extraordinary report
        const isEditable =
          targetRow.createdReportId === selectedReport.id ||
          (selectedReport.parentReportId &&
            targetRow.createdReportId === selectedReport.parentReportId) ||
          !targetRow.createdReportId;

        if (!isEditable) {
          setValidationError(
            "En este reporte extraordinario, solo puede ingresar cantidades actuales en las partidas que pertenecen al reporte principal superior vinculado (reporte padre) o que fueron creadas en este reporte.",
          );
          return false;
        }

        // "si se pasa del 100% de avance, no se puede agregar cantidad actual y debe crear un renglon nuevo"
        if (targetRow.createdReportId !== selectedReport.id) {
          const budgetVal = Number(targetRow.quantity ?? 0);
          const targetIdx = activeSheet.reports.findIndex(
            (r) => r.id === selectedReportId,
          );
          let priorSum = 0;
          for (let i = 0; i < targetIdx; i++) {
            if (activeSheet.reports[i].status === "CERRADO") {
              priorSum += activeSheet.reports[i].quantities[rowId] ?? 0;
            }
          }
          const projectAccumVal = priorSum + numVal;
          if (projectAccumVal > budgetVal) {
            setValidationError(
              `No se puede registrar esta cantidad de avance (${numVal}) ya que superaría el 100% del presupuestado para esta partida original (Presupuestado: ${budgetVal}, Acumulado anterior: ${priorSum}). En su lugar, debe crear una partida extraordinaria nueva para el excedente.`,
            );
            return false;
          }
        }
      } else if (targetRow) {
        // Enforce AUT checkbox to permit > 100% for standard reports
        const isAuthorized = !!(targetRow as any).authorized;
        if (!isAuthorized) {
          const budgetVal = Number(targetRow.quantity ?? 0);
          const targetIdx = activeSheet.reports.findIndex(
            (r) => r.id === selectedReportId,
          );
          let priorSum = 0;
          if (targetIdx !== -1) {
            for (let i = 0; i < targetIdx; i++) {
              if (activeSheet.reports[i].status === "CERRADO") {
                priorSum += activeSheet.reports[i].quantities[rowId] ?? 0;
              }
            }
          }
          const projectAccumVal = priorSum + numVal;
          // Note: if budgetVal is 0, we treat it as infinite or not applicable, to allow completely unplanned rows.
          if (projectAccumVal > budgetVal && budgetVal > 0) {
            setValidationError(
              `No se puede registrar esta cantidad de avance (${numVal}) ya que superaría el 100% del presupuestado. Debe cotejar la casilla de autorización (AUT) en la columna Control Exceso si desea permitir cantidades por encima del 100%.`,
            );
            return false;
          }
        }
      }
      
      const updatedReports = (activeSheet.reports || []).map((r) => {
        if (r.id === selectedReportId) {
          const updatedFormulas = r.formulas ? { ...r.formulas } : {};
          if (formula !== undefined) {
             if (formula.trim() !== "") {
                updatedFormulas[rowId] = formula;
             } else {
                delete updatedFormulas[rowId];
             }
          }

          const updatedGrids = r.grids ? { ...r.grids } : {};
          if (gridJson !== undefined) {
             if (gridJson) {
                updatedGrids[rowId] = gridJson;
             } else {
                delete updatedGrids[rowId];
             }
          }
          
          return {
            ...r,
            quantities: {
              ...r.quantities,
              [rowId]: numVal,
            },
            formulas: updatedFormulas,
            grids: updatedGrids,
          };
        }
        return r;
      });

      onUpdateSheet({
        ...activeSheet,
        reports: updatedReports,
      });
      return true;
    }

    const isRowExtraordinaryLocked =
      isReportExtraordinary(selectedReport) &&
      activeSheet.rows.find((x) => x.id === rowId)?.createdReportId !==
        selectedReport?.id;
    if (
      isRowExtraordinaryLocked &&
      field !== "observations" &&
      field !== "quantityActual"
    ) {
      setValidationError(
        "No se puede modificar la estructura de este renglón. En reportes extraordinarios solo puede modificar las partidas creadas exclusivamente para este sub-reporte.",
      );
      return false;
    }

    if (field === "quantityPresup") {
      const numVal = parseFloat(value) || 0;
      const updatedRows = activeSheet.rows.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            quantity: numVal,
          };
        }
        return r;
      });

      onUpdateSheet({
        ...activeSheet,
        rows: updatedRows,
      });
      return true;
    }

    if (field === "priceUnit") {
      if (selectedReport?.status === "CERRADO") {
        setValidationError(
          "Este reporte está cerrado y congelado. No se pueden modificar los precios unitarios.",
        );
        return false;
      }

      // Check if row has prior closed quantities
      const targetIdx = (activeSheet.reports || []).findIndex(
        (r) => r.id === selectedReportId,
      );
      let priorSum = 0;
      if (targetIdx !== -1) {
        for (let i = 0; i < targetIdx; i++) {
          if (activeSheet.reports[i].status === "CERRADO") {
            priorSum += activeSheet.reports[i].quantities[rowId] ?? 0;
          }
        }
      }
      if (priorSum > 0) {
        setValidationError(
          "Este precio unitario no se puede modificar porque ya tiene cantidades acumuladas en reportes anteriores.",
        );
        return false;
      }
    }

    const updatedRows = activeSheet.rows.map((row) => {
      if (row.id === rowId) {
        let cleanValue = value;
        if (field === "priceUnit" || field === "quantity") {
          cleanValue = parseFloat(value) || 0;
        }
        const extraUpdates: any = {};
        if (field === "priceUnit" || field === "quantity" || field === "quantityActual" || field === "quantityPresup") {
          // If a field parameter is provided, we use it directly. This handles standard grid values, formula, and JSON structure.
        }
        
        if (field === "quantity") {
          if (formula !== undefined) {
             extraUpdates.quantityFormula = formula.trim() !== "" ? formula : undefined;
          }
          if (gridJson !== undefined) {
             extraUpdates.quantityGrid = gridJson;
          }
        }
        return {
          ...row,
          ...extraUpdates,
          [field]: cleanValue,
        };
      }
      return row;
    });

    onUpdateSheet({
      ...activeSheet,
      rows: updatedRows,
    });
    return true;
  };

  const handleKeyDownEnter = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    fieldName: string,
  ) => {
    if (e.key === "Enter") {
      if (e.currentTarget.tagName.toLowerCase() === "textarea" && e.shiftKey) {
        return;
      }
      e.preventDefault();
      const currentTr = e.currentTarget.closest("tr");
      if (!currentTr) return;

      const table = currentTr.closest("table");
      if (!table) return;

      const allTrs = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
      const currentIndex = allTrs.indexOf(currentTr as HTMLTableRowElement);
      if (currentIndex === -1) return;

      for (let i = currentIndex + 1; i < allTrs.length; i++) {
        const nextInput = allTrs[i].querySelector(
          `[data-field="${fieldName}"]:not(:disabled), textarea[data-field="${fieldName}"]:not(:disabled)`,
        ) as HTMLInputElement | HTMLTextAreaElement | null;
        if (nextInput) {
          nextInput.focus();
          if (typeof nextInput.select === "function") {
            nextInput.select();
          }
          break;
        }
      }
    }
  };

  const confirmPuChange = () => {
    if (!pendingPuChange || !activeSheet) return;
    const { rowId, value } = pendingPuChange;

    const updatedRows = activeSheet.rows.map((row) => {
      if (row.id === rowId) {
        return { ...row, priceUnit: value };
      }
      return row;
    });

    onUpdateSheet({
      ...activeSheet,
      rows: updatedRows,
    });

    setShowPUWarningModal(false);
    setPendingPuChange(null);
  };

  // --- DRAG AND DROP ACTIVITIES HANDLERS ---
  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData("text/plain", rowId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingRowId(rowId);
  };

  const handleRowDragOver = (e: React.DragEvent, rowId: string) => {
    if (draggingRowId === rowId) return;
    e.preventDefault();
    setDragOverRowId(rowId);
  };

  const handleRowDragLeave = (e: React.DragEvent) => {
    setDragOverRowId(null);
  };

  const handleRowDragEnd = () => {
    setDraggingRowId(null);
    setDragOverRowId(null);
    setDragOverSubchapter(null);
    setCanDragRowId(null);
  };

  const handleRowDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain") || draggingRowId;
    setDraggingRowId(null);
    setDragOverRowId(null);
    setDragOverSubchapter(null);
    setCanDragRowId(null);

    if (!draggedId || draggedId === targetRowId || !activeSheet) return;

    const draggedRow = activeSheet.rows.find((r) => r.id === draggedId);
    const targetRow = activeSheet.rows.find((r) => r.id === targetRowId);
    if (!draggedRow || !targetRow) return;

    const targetSubchapter = targetRow.subchapter || "";

    const remainingRows = activeSheet.rows.filter((r) => r.id !== draggedId);
    const targetIndex = remainingRows.findIndex((r) => r.id === targetRowId);

    const updatedDraggedRow = {
      ...draggedRow,
      subchapter: targetSubchapter,
    };

    const newRows = [...remainingRows];
    newRows.splice(targetIndex, 0, updatedDraggedRow);

    onUpdateSheet({
      ...activeSheet,
      rows: newRows,
    });
  };

  const handleSubchapterDragOver = (
    e: React.DragEvent,
    subchapterName: string,
  ) => {
    e.preventDefault();
    setDragOverSubchapter(subchapterName);
  };

  const handleSubchapterDragLeave = () => {
    setDragOverSubchapter(null);
  };

  const handleDropOnSubchapter = (
    e: React.DragEvent,
    targetSubchapter: string,
  ) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain") || draggingRowId;
    setDraggingRowId(null);
    setDragOverRowId(null);
    setDragOverSubchapter(null);

    if (!draggedId || !activeSheet) return;

    const draggedRow = activeSheet.rows.find((r) => r.id === draggedId);
    if (!draggedRow) return;

    // Normalizing empty subchapter vs named
    const cleanSubchapter =
      targetSubchapter === "Primer Nivel" &&
      !activeSheet.rows.some((r) => r.subchapter === "Primer Nivel")
        ? ""
        : targetSubchapter;

    const remainingRows = activeSheet.rows.filter((r) => r.id !== draggedId);
    const targetRows = remainingRows.filter(
      (r) => (r.subchapter?.trim() || "Primer Nivel") === targetSubchapter,
    );

    let insertIndex = remainingRows.length;
    if (targetRows.length > 0) {
      const lastRowOfSub = targetRows[targetRows.length - 1];
      insertIndex =
        remainingRows.findIndex((r) => r.id === lastRowOfSub.id) + 1;
    }

    const updatedDraggedRow = {
      ...draggedRow,
      subchapter: cleanSubchapter,
    };

    const newRows = [...remainingRows];
    newRows.splice(insertIndex, 0, updatedDraggedRow);

    onUpdateSheet({
      ...activeSheet,
      rows: newRows,
    });
  };

  const handleSubchapterDragStart = (e: React.DragEvent, subName: string) => {
    e.dataTransfer.setData("text/subchapter", subName);
    e.dataTransfer.effectAllowed = "move";
    setDraggingSubchapter(subName);
  };

  const handleSubchapterMoveDragOver = (e: React.DragEvent, subName: string) => {
    if (draggingSubchapter === subName) return;
    e.preventDefault();
    setDragOverSubchapterMoveTarget(subName);
  };

  const handleSubchapterMoveDragLeave = () => {
    setDragOverSubchapterMoveTarget(null);
  };

  const handleSubchapterMoveDrop = (e: React.DragEvent, targetSub: string) => {
    e.preventDefault();
    const draggedSub = e.dataTransfer.getData("text/subchapter") || draggingSubchapter;
    setDraggingSubchapter(null);
    setDragOverSubchapterMoveTarget(null);
    setCanDragSubchapter(null);

    if (!draggedSub || draggedSub === targetSub || !activeSheet) return;

    // Get ordered subchapter names
    const orderedSubs = Object.keys(groupedRows);
    const draggedIdx = orderedSubs.indexOf(draggedSub);
    const targetIdx = orderedSubs.indexOf(targetSub);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const newSubOrder = [...orderedSubs];
    newSubOrder.splice(draggedIdx, 1);
    const insertIdx = newSubOrder.indexOf(targetSub);
    // Insert relative to the target
    newSubOrder.splice(insertIdx, 0, draggedSub);

    // Group the original list of rows by subchapter
    const rowsBySub: Record<string, typeof activeSheet.rows> = {};
    activeSheet.rows.forEach((row) => {
      const sub = row.subchapter?.trim() || "Primer Nivel";
      if (!rowsBySub[sub]) {
        rowsBySub[sub] = [];
      }
      rowsBySub[sub].push(row);
    });

    // Reconstruct the rows following the new subchapter order
    const reorderedRows: typeof activeSheet.rows = [];
    newSubOrder.forEach((sub) => {
      if (rowsBySub[sub]) {
        reorderedRows.push(...rowsBySub[sub]);
        delete rowsBySub[sub]; // remove from temporary structure
      }
    });

    // Append any leftover subchapters that were not in orderedSubs
    Object.values(rowsBySub).forEach((list) => {
      reorderedRows.push(...list);
    });

    onUpdateSheet({
      ...activeSheet,
      rows: reorderedRows,
    });
  };

  // Append new empty row with calculated numbering
  const handleAddNewRow = () => {
    if (!activeSheet) return;

    if (selectedReport?.status === "CERRADO") {
      setValidationError(
        "La actividad o la descripción del trabajo no se puede agregar en reportes anteriores, ni en el actual si está cerrado. Solamente en los nuevos o reabriendo el último.",
      );
      return;
    }

    // Check validation based on either default quantity or current active execution
    const hasInvalidRow = activeSheet.rows.some((row) => {
      // In an extraordinary report, skip validation for locked rows (since they cannot be edited anyway)
      const isRowExtraordinaryLocked =
        isReportExtraordinary(selectedReport) &&
        row.createdReportId !== selectedReport?.id;
      if (isRowExtraordinaryLocked) return false;

      const q = getRowQuantities(row.id).actual;
      const p = row.priceUnit;
      return !row.unit || p === 0 || isNaN(q) || isNaN(p);
    });

    if (hasInvalidRow) {
      setValidationError(
        "No se puede agregar un nuevo renglón si existen partidas con Cantidad u Horas vacías o Precio Unitario en cero o vacío. Por favor, complete o corrija las partidas existentes primero.",
      );
      return;
    }

    const lastRow = activeSheet.rows[activeSheet.rows.length - 1];
    const defaultSub = lastRow?.subchapter || "Primer Nivel";
    const defaultContractor =
      activeSheet.contractorId || contractors[0]?.id || "";

    const nextNo = activeSheet.rows.length + 1;
    const newId = `row-gen-${Date.now()}`;
    const newRow: ProductionRow = {
      id: newId,
      no: nextNo,
      contractorId: defaultContractor,
      description: "Nueva partida de trabajo contratado",
      quantity: 100, // Contract quantity
      unit: "m2",
      priceUnit: 100.0,
      observations: "",
      subchapter: defaultSub,
      createdReportId: selectedReportId || undefined,
    };

    // Update active report quantities for this new row to default to 0 movement
    const updatedReports = (activeSheet.reports || []).map((r) => {
      if (r.id === selectedReportId) {
        return {
          ...r,
          quantities: {
            ...r.quantities,
            [newId]: 0, // 0 movement initially
          },
        };
      }
      return r;
    });

    onUpdateSheet({
      ...activeSheet,
      rows: [...activeSheet.rows, newRow],
      reports: updatedReports,
    });
  };

  // Duplicate an existing row
  const handleDuplicateRow = (rowToDuplicate: ProductionRow) => {
    if (!activeSheet) return;

    if (selectedReport?.status === "CERRADO") {
      setValidationError(
        "La actividad o la descripción del trabajo no se puede agregar en reportes anteriores, ni en el actual si está cerrado. Solamente en los nuevos o reabriendo el último.",
      );
      return;
    }

    const isRowExtraordinaryLocked =
      isReportExtraordinary(selectedReport) &&
      rowToDuplicate.createdReportId !== selectedReport?.id;
    if (isRowExtraordinaryLocked) {
      setValidationError(
        "No se puede duplicar un renglón existente en un reporte extraordinario. Solo puede crear partidas completamente nuevas.",
      );
      return;
    }

    const duplicatedId = `row-gen-${Date.now()}`;
    const duplicatedRow: ProductionRow = {
      ...rowToDuplicate,
      id: duplicatedId,
      no: activeSheet.rows.length + 1,
      description: `${rowToDuplicate.description} (Copia)`,
      createdReportId: selectedReportId || undefined,
    };

    // Insert duplicated row directly under the duplicated item in the activeSheet rows array
    const clickedIndex = activeSheet.rows.findIndex(
      (r) => r.id === rowToDuplicate.id,
    );
    const updatedRows = [...activeSheet.rows];
    updatedRows.splice(clickedIndex + 1, 0, duplicatedRow);

    // Renumber to preserve perfect sequential ordering (no)
    const renumberedRows = updatedRows.map((row, idx) => ({
      ...row,
      no: idx + 1,
    }));

    // Register 0 quantity actual in reports for new duplicated row
    const targetQ = getRowQuantities(rowToDuplicate.id).actual;
    const updatedReports = (activeSheet.reports || []).map((r) => {
      if (r.id === selectedReportId) {
        return {
          ...r,
          quantities: {
            ...r.quantities,
            [duplicatedId]: targetQ, // matches original row quantity
          },
        };
      }
      return r;
    });

    onUpdateSheet({
      ...activeSheet,
      rows: renumberedRows,
      reports: updatedReports,
    });
  };

  // Delete row from the spreadsheet page
  const handleDeleteRowCustom = (rowId: string) => {
    if (!activeSheet) return;

    if (selectedReport?.status === "CERRADO") {
      setValidationError(
        "La actividad o la descripción del trabajo no se puede eliminar en reportes anteriores ni en el actual si está cerrado. Solamente en los nuevos o reabriendo el último.",
      );
      return;
    }

    const targetRow = activeSheet.rows.find((x) => x.id === rowId);
    if (targetRow && targetRow.createdReportId !== selectedReportId) {
      setValidationError(
        "No se puede eliminar esta partida porque fue creada en un reporte anterior. Solo se permiten eliminar partidas creadas en el reporte actual.",
      );
      return;
    }

    const isRowExtraordinaryLocked =
      isReportExtraordinary(selectedReport) &&
      targetRow?.createdReportId !== selectedReport?.id;
    if (isRowExtraordinaryLocked) {
      setValidationError(
        "No se puede eliminar este renglón. En reportes extraordinarios solo puede eliminar partidas creadas exclusivamente para este sub-reporte.",
      );
      return;
    }

    const remainingRows = activeSheet.rows
      .filter((row) => row.id !== rowId)
      .map((row, idx) => ({ ...row, no: idx + 1 })); // Recalculate No sequence

    const updatedReports = (activeSheet.reports || []).map((r) => {
      const q = { ...r.quantities };
      delete q[rowId];
      return {
        ...r,
        quantities: q,
      };
    });

    onUpdateSheet({
      ...activeSheet,
      rows: remainingRows,
      reports: updatedReports,
    });
  };

  const handleCreateSubchapter = (subName: string) => {
    if (!activeSheet) return;
    const cleanSubName = subName.trim();
    if (!cleanSubName) return;

    if (selectedReport?.status === "CERRADO") {
      setValidationError(
        "No se puede crear un capítulo si el reporte actual está cerrado. Reabra el último reporte o cree uno nuevo.",
      );
      return;
    }

    const defaultContractor = activeSheet.contractorId || contractors[0]?.id || "";
    const nextNo = activeSheet.rows.length + 1;
    const newId = `row-gen-${Date.now()}`;
    const newRow: ProductionRow = {
      id: newId,
      no: nextNo,
      contractorId: defaultContractor,
      description: `Nueva partida para el capítulo ${cleanSubName}`,
      quantity: 100, // Contract quantity
      unit: "m2",
      priceUnit: 100.0,
      observations: "",
      subchapter: cleanSubName,
      createdReportId: selectedReportId || undefined,
    };

    // Update active report quantities for this new row to default to 0 movement
    const updatedReports = (activeSheet.reports || []).map((r) => {
      if (r.id === selectedReportId) {
        return {
          ...r,
          quantities: {
            ...r.quantities,
            [newId]: 0, // 0 movement initially
          },
        };
      }
      return r;
    });

    onUpdateSheet({
      ...activeSheet,
      rows: [...activeSheet.rows, newRow],
      reports: updatedReports,
    });
  };

  const handleRenameSubchapter = (oldName: string, newName: string) => {
    if (!activeSheet) return;
    const cleanNewName = newName.trim();
    if (!cleanNewName) return;

    if (selectedReport?.status === "CERRADO") {
      setValidationError(
        "No se puede renombrar un capítulo si el reporte actual está cerrado. Reabra el último reporte o cree uno nuevo.",
      );
      return;
    }

    const updatedRows = activeSheet.rows.map((r) => {
      const currentSub = r.subchapter?.trim() || "Primer Nivel";
      if (currentSub === oldName) {
        return {
          ...r,
          subchapter: cleanNewName,
        };
      }
      return r;
    });

    onUpdateSheet({
      ...activeSheet,
      rows: updatedRows,
    });
  };

  // Modify active sheet header details
  const handleSaveHeaderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setHeaderEditError("");

    if (!draftName.trim()) {
      setHeaderEditError("El nombre de la hoja no puede estar vacío.");
      return;
    }
    if (!draftCode.trim()) {
      setHeaderEditError("El código de ajuste no puede estar vacío.");
      return;
    }

    // Check duplicate name in other sheets (case-insensitive, trimmed)
    const duplicateName = sheets.some(
      (s) =>
        s.id !== activeSheet?.id &&
        s.name.trim().toLowerCase() === draftName.trim().toLowerCase(),
    );
    if (duplicateName) {
      setHeaderEditError(
        `Ya existe otra hoja de producción con el nombre '${draftName.trim()}'. Por favor, use un nombre diferente.`,
      );
      return;
    }

    if (activeSheet) {
      onUpdateSheet({
        ...activeSheet,
        contractorId: draftContractorId || undefined,
        supervisor: draftSupervisor,
        code: draftCode,
        name: draftName,
        activity: draftActivity,
      });
    }

    setIsEditingHeader(false);
  };

  // Create a brand new production sheet
  const handleCreateSheet = (e: React.FormEvent) => {
    e.preventDefault();
    setNewSheetError("");

    if (!newSheetContractorId.trim())
      return setNewSheetError("Debe seleccionar un Ajustero (Contratista) de la lista. No se puede crear hoja sin contratista asignado.");
    if (!newSheetCode.trim())
      return setNewSheetError("El código de ajuste es requerido (ej. Op2)");
    if (!newSheetName.trim())
      return setNewSheetError(
        "El nombre de la hoja es requerido (ej. Op2 - Pintura)",
      );
    if (!newSheetActivity.trim())
      return setNewSheetError("Describa la actividad del lote de obra");

    const sheetCodeClean = newSheetCode.toLowerCase().replace(/\s+/g, "_");

    // Check if duplicate tab ID or duplicate name
    if (sheets.some((s) => s.id === sheetCodeClean)) {
      return setNewSheetError(
        `Ya existe una hoja con el código técnico '${sheetCodeClean}'`,
      );
    }
    if (
      sheets.some(
        (s) =>
          s.name.trim().toLowerCase() === newSheetName.trim().toLowerCase(),
      )
    ) {
      return setNewSheetError(
        `Ya existe una hoja con el nombre '${newSheetName}'. Por favor use un nombre diferente.`,
      );
    }

    if (!newSheetContractorId) {
      return setNewSheetError("Debe seleccionar un contratista existente de la base de datos.");
    }
    const created: ProductionSheet = {
      id: sheetCodeClean,
      name: newSheetName,
      supervisor: newSheetSupervisor,
      code: newSheetCode,
      activity: newSheetActivity,
      contractorId: newSheetContractorId || undefined,
      rows: [
        {
          id: `row-init-${Date.now()}`,
          no: 1,
          contractorId: newSheetContractorId || contractors[0]?.id || "",
          description: "Partida de inicio configurada",
          quantity: 100,
          unit: "m2",
          priceUnit: 250,
          observations: "Reportes iniciales",
          subchapter: "Primer Nivel",
        },
      ],
    };

    onAddSheet(created);
    onSetActiveSheetId(created.id);
    setShowNewSheetModal(false);

    // Reset form
    setNewSheetContractorId("");
    setNewSheetCode("");
    setNewSheetName("");
    setNewSheetActivity("");
  };

  const handleDeleteActiveSheet = () => {
    if (!activeSheet) return;
    setDeleteSheetPassword("");
    setDeleteSheetPasswordError("");
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteActiveSheet = () => {
    if (!activeSheet) return;

    // Validate admin password
    if (!validateAdminPassword(deleteSheetPassword)) {
      setDeleteSheetPasswordError(
        "Clave incorrecta. Ingrese la clave de un Administrador.",
      );
      return;
    }

    const remaining = sheets.filter((s) => s.id !== activeSheet.id);
    onDeleteSheet(activeSheet.id);
    onSetActiveSheetId(remaining[0]?.id || null);
    setShowDeleteConfirm(false);
  };

  // Print preview configuration & warnings calculations
  const gridInfo = useMemo(() => {
    if (!printWithMeasurements || !selectedReport?.grids) return { maxCols: 0, maxWidth: 0 };
    let maxCols = 0;
    let maxWidth = 0;
    Object.values(selectedReport.grids).forEach((gridJson) => {
      try {
        const parsed = JSON.parse(gridJson as string);
        if (parsed && typeof parsed === 'object') {
          const colsCount = parsed.colWidths ? Object.keys(parsed.colWidths).length : (parsed.cols || 0);
          maxCols = Math.max(maxCols, colsCount);
          
          let currentW = 40; // index column
          for (let c = 1; c <= colsCount; c++) {
            const colW = (parsed.colWidths && parsed.colWidths[c]) || 95;
            currentW += colW;
          }
          maxWidth = Math.max(maxWidth, currentW);
        }
      } catch (e) {}
    });
    return { maxCols, maxWidth };
  }, [printWithMeasurements, selectedReport?.grids]);

  const printOrientation = (printWithMeasurements && gridInfo.maxWidth > 580) ? "landscape" : "portrait";

  const exceedsSelectedPaper = useMemo(() => {
    if (!printWithMeasurements) return false;
    let limitW = 920;
    if (paperSize === "legal") limitW = 1200;
    if (paperSize === "a4") limitW = 1050;
    if (paperSize === "a3") limitW = 1750;
    return gridInfo.maxWidth > limitW;
  }, [printWithMeasurements, paperSize, gridInfo.maxWidth]);

  const suggestedSize = gridInfo.maxWidth > 1200 ? "a3" : (gridInfo.maxWidth > 920 ? "legal" : "letter");

  const printStyleHTML = `
    @media print {
      @page {
        size: ${printOrientation === "landscape" ? paperSize + " landscape" : "portrait"} !important;
        margin: 0 !important;
      }
      /* Hide standard web workspace elements */
      body * {
        visibility: hidden !important;
      }
      /* Show ONLY our printable content container */
      #printable-invoice-modal,
      #printable-invoice-modal * {
        visibility: visible !important;
      }
      #printable-invoice-modal {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0.35in !important;
        background: white !important;
        color: black !important;
        box-shadow: none !important;
        border: none !important;
        font-size: 7.5px !important;
      }
      /* Keep backgrounds on print */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      /* Force row flow on flex elements on print */
      .print-row {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
      }
      .print-grid-2 {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px 16px !important;
      }
      .print-grid-2 > div {
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      .print-grid-2 > div > :not(:first-child) {
        margin-top: 1px !important;
      }
      /* Tighten spacing */
      .space-y-6 > :not(:first-child) {
        margin-top: 0.2rem !important;
      }
      .space-y-4 > :not(:first-child) {
        margin-top: 0.15rem !important;
      }
      .space-y-2 > :not(:first-child) {
        margin-top: 0.1rem !important;
      }
      .pt-2 {
        padding-top: 0.1rem !important;
      }
      .pb-5 {
        padding-bottom: 0.15rem !important;
      }
      .border-b-2 {
        border-bottom-width: 1px !important;
      }
      /* Headers & Info blocks */
      h1 {
        font-size: 11px !important;
        margin: 0 !important;
        line-height: 1.1 !important;
      }
      p {
        font-size: 7px !important;
        margin: 0 !important;
      }
      /* Table styling */
      th {
        padding: 1px 3px !important;
        font-size: 7px !important;
        background-color: #f1f5f9 !important;
      }
      td {
        padding: 1px 3px !important;
        font-size: 7px !important;
      }
      /* Signatures */
      .h-10 {
        height: 8px !important;
      }
      /* Financial Summary box on print */
      .print-financial-box {
        background-color: white !important;
        color: black !important;
        border-radius: 6px !important;
        padding: 6px 8px !important;
        border: 1px solid #94a3b8 !important;
      }
      .print-financial-box > div {
        margin-top: 1px !important;
        font-size: 7.2px !important;
      }
      .print-financial-box span,
      .print-financial-box div {
        color: black !important;
      }
      .print-financial-box .border-slate-250 {
        border-color: #cbd5e1 !important;
      }
      /* Terms box */
      .bg-slate-50 {
        background-color: transparent !important;
        border: none !important;
        padding: 0 !important;
        font-size: 6.5px !important;
        line-height: 1.2 !important;
      }
      /* Ensure everything fits automatically and adjusts to full available width on print */
      #printable-invoice-modal table,
      #printable-invoice-modal div,
      #printable-invoice-modal section,
      #printable-invoice-modal {
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Auto-sizing behavior for read-only measurement tables */
      .table-auto {
        table-layout: auto !important;
        width: 100% !important;
      }
      .table-auto th, .table-auto td {
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        max-width: none !important;
      }

      /* Clean page breaking rules to prevent cutting text/measurements between pages */
      tr, td, th, p, span, h1, h2, h3, h4,
      .break-inside-avoid,
      .print\:break-inside-avoid {
        break-inside: avoid !important;
        break-inside: avoid-page !important;
        page-break-inside: avoid !important;
      }

      /* Avoid breaking between tables and measurement support components */
      .separate-page-support, 
      [id^="separate-page-support"],
      div[class*="border-slate-350"] {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* Absolute split only for independent documents/standalone copies or supports */
      .break-before-page,
      .print\:break-before-page {
        break-before: page !important;
        page-break-before: always !important;
      }
      
      thead {
        display: table-header-group !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `;

  return (
    <div id="production-sheets-tab" className={isFullscreen ? "fixed inset-0 z-[100] bg-slate-50 overflow-auto space-y-6 px-4 py-4" : "space-y-6"}>
      {/* 1. Sheet Selector Tabs (Excel like workbook structure) */}
      <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center text-slate-500 text-xs px-2.5 space-x-1 border-r border-slate-300 font-semibold shrink-0">
            <Layers size={14} />
            <span>Pestañas Obra:</span>
          </div>
 
          {/* Filtering and Organizing Controls */}
          <div className="flex items-center gap-1.5 shrink-0 border-r border-slate-300 pr-3 mr-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Filtrar contratista..."
                value={tabSearchTerm}
                onChange={(e) => setTabSearchTerm(e.target.value)}
                className="pl-2 pr-6 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-hidden focus:border-blue-500 w-32 md:w-40 font-semibold"
              />
              {tabSearchTerm && (
                <button
                  type="button"
                  onClick={() => setTabSearchTerm("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-550 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <Plus size={11} className="rotate-45" />
                </button>
              )}
            </div>
 
            <select
              value={tabSortOrder}
              onChange={(e) => setTabSortOrder(e.target.value as "defecto" | "nombre" | "actividad")}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-700 focus:outline-hidden font-semibold cursor-pointer mr-1"
            >
              <option value="defecto">Defecto</option>
              <option value="nombre">Por Nombre (A-Z)</option>
              <option value="actividad">Por Actividad</option>
            </select>

            <select
              value={tabFilterType}
              onChange={(e) => setTabFilterType(e.target.value as "todos" | "cubicados")}
              className="px-2 py-1 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 focus:outline-hidden font-extrabold cursor-pointer"
            >
              <option value="cubicados">Cubicación Actual (Amarillo)</option>
              <option value="todos">Todos los Contratistas</option>
            </select>
          </div>
 
          {/* Actual workbook tabs listing */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
            {filteredAndSortedSheets.length === 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs italic px-2">Ningún contratista coincide</span>
                {tabFilterType === "cubicados" && (
                  <button
                    type="button"
                    onClick={() => setTabFilterType("todos")}
                    className="text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 cursor-pointer"
                  >
                    Ver todos sin cubicaciones
                  </button>
                )}
              </div>
            ) : (
              filteredAndSortedSheets.map((sheet) => {
                const isSelected = activeSheet && activeSheet.id === sheet.id;
                const isCubicado = hasCubicadasInLastReport(sheet);
                return (
                  <button
                    key={sheet.id}
                    onClick={() => onSetActiveSheetId(sheet.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? isCubicado
                          ? "bg-amber-300 text-slate-950 border-2 border-amber-500 shadow-2xs font-extrabold"
                          : "bg-white text-slate-900 border border-slate-300 shadow-2xs font-bold"
                        : isCubicado
                        ? "bg-amber-100 hover:bg-amber-200 text-slate-900 border border-amber-300 font-bold"
                        : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {isCubicado && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block animate-pulse"></span>}
                      {sheet.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setNewSheetSupervisor(params.responsible);
              setShowNewSheetModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3.5 py-1 rounded-lg flex items-center space-x-1 cursor-pointer shrink-0 border border-blue-700 shadow-sm transition-colors"
          >
            <Plus size={13} />
            <span>Insertar Hoja</span>
          </button>

          <button
            onClick={() => setShowWarrantyReleaseModal(true)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center space-x-1 cursor-pointer shrink-0 shadow-sm transition-colors"
          >
            <Banknote size={11} />
            <span>Liberación Retenidos</span>
          </button>
        </div>
      </div>

      {!activeSheet ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <p className="text-sm font-medium">
            No existen hojas de producción registradas.
          </p>
          <button
            onClick={() => setShowNewSheetModal(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-bold border border-blue-700 cursor-pointer shadow-sm"
          >
            Crear primera hoja de obra
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Card / Title info Block */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                  HOJA DE PRODUCCIÓN — AJUSTERO:{" "}
                  {activeSheet.name.toUpperCase()}
                  {activeSheet.contractorId && (
                    <span className="bg-blue-50 text-blue-750 font-black px-1.5 py-0.2 rounded font-sans scale-95 uppercase font-bold">
                      VINCULADO
                    </span>
                  )}
                </span>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <HardHat size={16} className="text-blue-600 shrink-0" />
                  <span>{activeSheet.name}</span>
                </h2>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    if (!isEditingHeader) {
                      setDraftContractorId(activeSheet.contractorId || "");
                      setDraftSupervisor(activeSheet.supervisor || "");
                      setDraftCode(activeSheet.code || "");
                      setDraftName(activeSheet.name || "");
                      setDraftActivity(activeSheet.activity || "");
                      setHeaderEditError("");
                    }
                    setIsEditingHeader(!isEditingHeader);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1 rounded-lg border border-slate-200 cursor-pointer font-medium"
                >
                  {isEditingHeader
                    ? "Cerrar Edición de Cabecera"
                    : "Modificar Cabecera de Hoja"}
                </button>
                <button
                  onClick={handleDeleteActiveSheet}
                  className="bg-red-50 hover:bg-red-100 text-red-600 hover:border-red-300 text-xs px-3 py-1 rounded-lg border border-red-200 cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <Trash2 size={13} />
                  <span>Eliminar Hoja</span>
                </button>
              </div>
            </div>

            {/* Editable Header Form or Static fields */}
            {isEditingHeader ? (
              <form
                onSubmit={handleSaveHeaderEdit}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg"
              >
                {headerEditError && (
                  <div className="md:col-span-3 bg-red-50 text-red-800 border border-red-200 p-2.5 rounded text-xs font-semibold">
                    ⚠️ {headerEditError}
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Ajustero / Contratista Propietario:
                  </label>
                  <select
                    value={draftContractorId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setDraftContractorId(cid);
                      const cont = contractors.find((c) => c.id === cid);
                      if (cont) {
                        const firstName = cont.name.trim().split(" ")[0];
                        const specialty = cont.type
                          ? cont.type.split("/")[0].trim()
                          : "Ajuste";
                        
                        let suggestedName = `${firstName} (${specialty})`;
                        let cleanCode = firstName
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]/g, "");

                        if (activeSheet.activity === "Pago de Retenciones de Garantía" || activeSheet.name.startsWith("LIB-")) {
                           suggestedName = `Liberación ${firstName} (${specialty})`;
                           cleanCode = `LIB-${cleanCode.substring(0, 8).toUpperCase()}`;
                        }

                        const uniqueObj = getUniqueSheetNameAndCode(
                          suggestedName,
                          cleanCode,
                          activeSheet.id,
                        );
                        setDraftName(uniqueObj.uniqueName);
                        setDraftCode(uniqueObj.uniqueCode);
                      }
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                  >
                    <option value="">-- Sin Vincular Ajustero --</option>
                    {[...contractors]
                      .filter(c => !c.isHidden && (!c.assignedProjectIds || c.assignedProjectIds.length === 0 || c.assignedProjectIds.includes(activeProjectId)))
                      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Ing. Supervisor / Ingeniero de Obra:
                  </label>
                  <input
                    type="text"
                    value={draftSupervisor}
                    onChange={(e) => setDraftSupervisor(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Código de Ajuste:
                  </label>
                  <input
                    type="text"
                    value={draftCode}
                    onChange={(e) => setDraftCode(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Nombre Ajustero / Hoja:
                  </label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Actividad Principal de Lote:
                  </label>
                  <input
                    type="text"
                    value={draftActivity}
                    onChange={(e) => setDraftActivity(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="bg-slate-900 text-white rounded text-xs font-bold py-1 px-4 cursor-pointer w-full"
                  >
                    Guardar Cabecera
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                <div className="space-y-1">
                  <span className="text-slate-400 block font-medium uppercase font-mono text-[9px]">
                    Ing. Supervisor / Ingeniero de Obra
                  </span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1 font-mono">
                    <User size={13} className="text-slate-400" />
                    <span>{activeSheet.supervisor}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block font-medium uppercase font-mono text-[9px]">
                    DESCRIPCIÓN DE TRABAJO GENERAL
                  </span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1">
                    <Activity size={13} className="text-slate-400" />
                    <span className="line-clamp-1">{activeSheet.activity}</span>
                  </p>
                </div>
              </div>
            )}
          </div>



          {/* REPORT SELECTOR CONTROL BAR */}
          {activeSheet.contractorId && (
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono mb-1">
                      Corte (Período):
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                      <select
                        value={selectedReportId || ""}
                        onChange={(e) => {
                          if (e.target.value === "ADD_NEW") {
                            const isWarrantySheet = activeSheet.activity === "Pago de Retenciones de Garantía" || 
                                                    (activeSheet.code && activeSheet.code.startsWith("LIB-")) || 
                                                    (activeSheet.name && (activeSheet.name.startsWith("LIB-") || activeSheet.name.startsWith("Liberación")));

                            const reps = (activeSheet?.reports || []).filter((r) => {
                              if (isWarrantySheet) {
                                  return r.isWarrantyRelease === true;
                              } else {
                                  return r.isWarrantyRelease !== true;
                              }
                            });

                            const openReps = reps.filter(
                              (r) => r.status === "ABIERTO",
                            );
                            if (openReps.length > 0) {
                              setValidationError(
                                "Debe cerrar el periodo de reporte abierto antes de iniciar un nuevo periodo de reporte.",
                              );
                              return;
                            }
                            let nextFrom = "";
                            if (reps.length > 0) {
                              let maxTo = reps[0].dateTo;
                              reps.forEach((r) => {
                                if (r.dateTo && r.dateTo.localeCompare(maxTo) > 0) {
                                  maxTo = r.dateTo;
                                }
                              });
                              nextFrom = maxTo;
                            } else {
                              nextFrom = "2026-05-01";
                            }
                            const nextTo = getClosestSaturday(get30DaysLaterStr(nextFrom));
                            if (isWarrantySheet) {
                              setNewRepName(`Pago de Retenciones de Garantía #${reps.length + 1}`);
                              setNewRepId(`REP-WAR-${String(reps.length + 1).padStart(3, '0')}`);
                            } else {
                              setNewRepName(`Reporte #${reps.length + 1}`);
                              setNewRepId(`REP-${String(reps.length + 1).padStart(3, '0')}`);
                            }
                            setNewRepFrom(nextFrom);
                            setNewRepTo(nextTo);
                            setIsExtraordinary(false);
                            setParentReportId("");
                            setShowNewReportModal(true);
                            return;
                          }
                          setSelectedReportIdState(e.target.value);
                        }}
                        className="bg-transparent text-white focus:outline-hidden font-bold text-xs font-mono cursor-pointer px-2.5 py-1"
                      >
                        {[...(activeSheet.reports || [])]
                          .filter((r) => {
                            const isWarrantySheet = activeSheet.activity === "Pago de Retenciones de Garantía" || 
                                                    (activeSheet.code && activeSheet.code.startsWith("LIB-")) || 
                                                    (activeSheet.name && (activeSheet.name.startsWith("LIB-") || activeSheet.name.startsWith("Liberación")));
                            if (isWarrantySheet) {
                              return r.isWarrantyRelease === true;
                            } else {
                              return r.isWarrantyRelease !== true;
                            }
                          })
                          .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }))
                          .map((r) => {
                          const isSub = r.name.includes(".");
                          return (
                            <option
                              key={r.id}
                              value={r.id}
                              className="bg-slate-900 text-white"
                            >
                              {isSub ? "⚡ " : "📅 "}
                              {r.name} ({formatDateReadable(r.dateFrom)} al{" "}
                              {formatDateReadable(r.dateTo)})
                              {isSub ? " (Extraordinario)" : ""}
                            </option>
                          );
                        })}
                        <option value="ADD_NEW" className="bg-indigo-900 text-white font-bold">
                          ➕ Nuevo Corte / Período...
                        </option>
                      </select>

                      {selectedReport && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditRepName(selectedReport.name);
                            setEditRepFrom(selectedReport.dateFrom);
                            setEditRepTo(selectedReport.dateTo);
                            setEditRepError("");
                            setShowEditReportModal(true);
                          }}
                          className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded-md transition-all shrink-0 mr-1 cursor-pointer"
                          title="Modificar nombre o fechas de este corte"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono mb-1">
                      Estado de Corte:
                    </span>
                    <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-850">
                      <span
                        className={`w-2 h-2 rounded-full ${selectedReport?.status === "ABIERTO" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                      />
                      <span className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-205">
                        {selectedReport?.status || "ABIERTO"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {(selectedReport?.status || "ABIERTO") === "ABIERTO" ? (
                    <button
                      type="button"
                      onClick={handleCloseReport}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold font-mono text-[11px] px-3.5 py-1 rounded-lg border border-rose-700 shadow-sm cursor-pointer transition-all uppercase flex items-center gap-1"
                    >
                      Cerrar Reporte
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-lg font-bold font-mono text-[11px] uppercase select-none">
                        Reporte Cerrado / Congelado
                      </span>
                      {isLatestReport ? (
                        <button
                          type="button"
                          onClick={handleReopenReport}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold font-mono text-[11px] px-3.5 py-1 rounded-lg border border-amber-750 shadow-sm cursor-pointer transition-all uppercase flex items-center gap-1"
                          title="Habilitar la edición de este corte porque aún es el último corte de pago registrado"
                        >
                          Reabrir para Editar
                        </button>
                      ) : (
                        <span
                          className="bg-rose-950/40 text-rose-300 border border-rose-900/60 px-3 py-1 rounded-lg font-bold font-mono text-[10px] uppercase select-none cursor-not-allowed"
                          title="No se puede habilitar la edición de este corte porque ya existe un nuevo corte de pago creado posterior a este"
                        >
                          No editable (Existe corte posterior)
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold font-mono text-[11px] px-3.5 py-1 rounded-lg border border-emerald-750 shadow-sm cursor-pointer transition-all uppercase flex items-center gap-1.5"
                    title="Vista previa e impresión de este comprobante en PDF"
                  >
                    <Printer size={13} className="text-emerald-100" />
                    <span>Imprimir Comprobante</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    title={isFullscreen ? "Restaurar tamaño normal" : "Maximizar el área de trabajo de la tabla estilo Excel"}
                    className="bg-slate-800 hover:bg-slate-700 hover:text-amber-300 text-slate-200 font-semibold font-mono text-[11px] px-3 py-1 rounded-lg border border-slate-700 cursor-pointer transition-all uppercase flex items-center gap-1"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 size={12} className="text-amber-400 shrink-0" />
                        Restaurar Tamaño
                      </>
                    ) : (
                      <>
                        <Maximize2 size={12} className="text-amber-400 shrink-0" />
                        Pantalla Completa
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-slate-400 font-bold">Ver:</span>
                  <div className="flex items-center gap-3 bg-slate-950 p-1 rounded-lg border border-slate-850">
                    <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded text-slate-300 font-semibold select-none">
                      <input
                        type="radio"
                        name="viewMode"
                        checked={viewMode === "actual"}
                        onChange={() => {
                          setViewMode("actual");
                          setShowHistoryMode(false);
                        }}
                        className="w-3.5 h-3.5 text-blue-500 cursor-pointer"
                      />
                      <span>Solo actual</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded text-slate-300 font-semibold select-none">
                      <input
                        type="radio"
                        name="viewMode"
                        checked={viewMode === "historico"}
                        onChange={() => {
                          setViewMode("historico");
                          setShowHistoryMode(true);
                        }}
                        className="w-3.5 h-3.5 text-blue-500 cursor-pointer"
                      />
                      <span>Historial completo</span>
                    </label>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideNoMovement}
                    onChange={(e) => setHideNoMovement(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded bg-slate-800 border-slate-700 cursor-pointer"
                  />
                  <span>Solo partidas con movimiento en este corte</span>
                </label>
              </div>
            </div>
          )}

          {/* 2. Interactive Spreadsheet Table Component with Custom Sections */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0 animate-fade-in relative production-table-container-wrapper">
            <div className="overflow-x-auto production-table-container" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table
                className="text-left border-collapse whitespace-nowrap"
                style={{
                  width: totalTableWidth,
                  minWidth: totalTableWidth,
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  {flatColumns.map((col) => (
                    <col
                      key={col.id}
                      style={{ width: colWidths[col.id] || col.defaultWidth }}
                    />
                  ))}
                </colgroup>
                <thead>
                  {viewMode === "historico" && activeSheet.contractorId ? (
                    // Excel Comparative Double Row Header Style
                    <>
                      <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-tight text-center">
                        <th
                          rowSpan={2}
                          className="px-2 py-3 text-center font-mono text-slate-300 border-b border-slate-800 relative group"
                        >
                          No.
                          {renderResizeHandle("no")}
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-3 text-center border-b border-slate-800 relative group"
                        >
                          ACCIONES
                          {renderResizeHandle("actions")}
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-3 text-left border-b border-slate-800 relative group"
                        >
                          Descripción del Trabajo
                          {renderResizeHandle("description")}
                        </th>

                        {/* Selected Active Sheet Columns group */}
                        <th
                          colSpan={4}
                          className="px-3 py-2 text-center bg-slate-800 border-l border-slate-700 text-blue-300 font-bold tracking-wider"
                        >
                          VISTA ACTUAL ({activeSheet.name})
                        </th>

                        {/* Dynamic Contractor Periods Columns group */}
                        {(activeSheet.reports || []).map((r, idx) => {
                          const isColCollapsed = !!collapsedPeriods[r.id];
                          if (isColCollapsed) {
                            return (
                              <th
                                key={r.id}
                                rowSpan={2}
                                onClick={() => togglePeriodCollapse(r.id)}
                                className="w-12 text-center bg-slate-850 text-slate-400 font-mono text-[9px] hover:bg-slate-805 hover:text-slate-200 border-l border-slate-700 py-3 relative cursor-pointer border-b border-slate-800 select-none group"
                                title={`Pestaña contraída. Clic para expandir ${r.name}`}
                              >
                                <div className="flex flex-col items-center justify-center space-y-0.5">
                                  <span className="text-[10px]">
                                    R.{idx + 1}
                                  </span>
                                  <span className="text-[11px] font-bold text-emerald-400">
                                    +
                                  </span>
                                </div>
                                {renderResizeHandle(`rep-${r.id}-collapsed`)}
                              </th>
                            );
                          }
                          return (
                            <th
                              key={r.id}
                              colSpan={2}
                              className="text-center bg-slate-950 border-l border-slate-800 py-1 relative border-b border-slate-850"
                            >
                              <div className="flex items-center justify-between px-2 gap-1.5">
                                <span className="opacity-0">[-]</span>
                                <span className="text-amber-500 text-[10px] uppercase font-mono font-bold">
                                  {r.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePeriodCollapse(r.id);
                                  }}
                                  className="text-slate-500 hover:text-rose-400 text-[9px] font-extrabold cursor-pointer hover:bg-slate-900 px-1 rounded-sm"
                                  title="Ocultar columna"
                                >
                                  [-]
                                </button>
                              </div>
                              <div
                                className="text-[9px] text-slate-400 font-mono font-medium truncate max-w-[145px] mx-auto text-center"
                                title={`${formatDateReadable(r.dateFrom)} al ${formatDateReadable(r.dateTo)}`}
                              >
                                {formatDateReadable(r.dateFrom)} al{" "}
                                {formatDateReadable(r.dateTo)}
                              </div>
                            </th>
                          );
                        })}

                        {/* Summed Accumulator column group */}
                        {(() => {
                          const isAcumCollapsed =
                            !!collapsedPeriods["acumulado"];
                          if (isAcumCollapsed) {
                            return (
                              <th
                                onClick={() =>
                                  togglePeriodCollapse("acumulado")
                                }
                                rowSpan={2}
                                className="w-12 text-center bg-slate-850 text-slate-400 font-mono text-[9px] hover:bg-slate-805 hover:text-slate-200 border-l border-slate-700 py-3 relative cursor-pointer border-b border-slate-800 select-none group"
                                title="Reporte Acumulado contraído. Clic para expandir"
                              >
                                <div className="flex flex-col items-center justify-center space-y-0.5">
                                  <span>ACUM</span>
                                  <span className="text-[11px] font-bold text-teal-400">
                                    +
                                  </span>
                                </div>
                                {renderResizeHandle("acum-collapsed")}
                              </th>
                            );
                          }
                          return (
                            <th
                              colSpan={4}
                              className="text-center bg-teal-950/90 border-l border-teal-900 py-1 border-b border-teal-900/50"
                            >
                              <div className="flex items-center justify-between px-2 gap-1.5">
                                <span className="opacity-0">[-]</span>
                                <span className="text-teal-300 text-[10px] uppercase font-bold font-mono">
                                  REPORTE ACUMULADO
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePeriodCollapse("acumulado");
                                  }}
                                  className="text-teal-505 hover:text-rose-455 text-[9px] font-extrabold cursor-pointer hover:bg-teal-950 px-1 rounded-sm"
                                  title="Ocultar acumulado"
                                >
                                  [-]
                                </button>
                              </div>
                              <div className="text-[9px] text-teal-450 font-semibold font-mono text-center">
                                ({(activeSheet.reports || []).length} periodos
                                de obra)
                              </div>
                            </th>
                          );
                        })()}

                        <th
                          rowSpan={2}
                          className="px-3 py-3 text-left border-b border-slate-800 relative group"
                        >
                          Observación
                          {renderResizeHandle("observation")}
                        </th>
                      </tr>
                      <tr className="bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wide border-b border-slate-800">
                        {/* Subheaders under Presupuestado / Vista Actual */}
                        <th className="px-1.5 py-2 text-center border-l border-slate-700 font-mono text-blue-400 bg-slate-850 relative group">
                          Cant.
                          {renderResizeHandle("current-cant")}
                        </th>
                        <th className="px-1.5 py-2 text-center font-mono text-blue-400 bg-slate-850 font-sans relative group">
                          Unid.
                          {renderResizeHandle("current-unid")}
                        </th>
                        <th className="px-2 py-2 text-right font-mono text-blue-400 bg-slate-850 relative group">
                          P. Unit.
                          <div className="text-[8px] opacity-75 font-normal tracking-wide">
                            ({params.currency || "DOP"})
                          </div>
                          {renderResizeHandle("current-punit")}
                        </th>
                        <th className="px-2 py-2 text-right bg-slate-800 font-mono text-blue-300 relative group">
                          Valor
                          <div className="text-[8px] opacity-75 font-normal tracking-wide">
                            ({params.currency || "DOP"})
                          </div>
                          {renderResizeHandle("current-valor")}
                        </th>

                        {/* Dynamic Period subheaders */}
                        {(activeSheet.reports || []).map((r) => {
                          const isColCollapsed = !!collapsedPeriods[r.id];
                          if (isColCollapsed) return null;
                          return (
                            <React.Fragment key={`sub-${r.id}`}>
                              <th className="px-1.5 py-2 text-center border-l border-slate-755 font-mono text-slate-355 bg-slate-900/60 relative group">
                                Cant.
                                {renderResizeHandle(`rep-${r.id}-cant`)}
                              </th>
                              <th className="px-1.5 py-2 text-right font-mono text-slate-355 bg-slate-905/65 relative group">
                                Valor
                                <div className="text-[8px] opacity-75 font-normal tracking-wide">
                                  ({params.currency || "DOP"})
                                </div>
                                {renderResizeHandle(`rep-${r.id}-valor`)}
                              </th>
                            </React.Fragment>
                          );
                        })}

                        {/* Acumulado subheaders */}
                        {!collapsedPeriods["acumulado"] && (
                          <>
                            <th className="px-1.5 py-2 text-center border-l border-teal-850 font-mono text-teal-300 bg-teal-950/60 relative group">
                              Cant.
                              {renderResizeHandle("acum-cant")}
                            </th>
                            <th className="px-1.5 py-2 text-center font-mono text-teal-300 bg-teal-950/60 relative group">
                              % Avance
                              {renderResizeHandle("acum-pct")}
                            </th>
                            <th className="px-1.5 py-2 text-right font-mono text-teal-300 bg-teal-950/65 font-bold relative group">
                              Valor
                              <div className="text-[8px] opacity-75 font-normal tracking-wide">
                                ({params.currency || "DOP"})
                              </div>
                              {renderResizeHandle("acum-valor")}
                            </th>
                            <th className="px-1.5 py-2 text-center font-mono text-amber-400 bg-teal-950/60 relative group leading-tight">
                              Control<br/>Exceso
                              {renderResizeHandle("acum-excess")}
                            </th>
                          </>
                        )}
                      </tr>
                    </>
                  ) : (
                    // CUBICACIONES ACUMULADAS: Cumulative Dynamic Multi-Block Columns Style
                    <>
                      <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-tight text-center">
                        <th
                          rowSpan={2}
                          className="px-1.5 py-3 text-center font-mono text-slate-400 border-b border-slate-800 relative group"
                        >
                          No.
                          {renderResizeHandle("no")}
                        </th>
                        <th
                          rowSpan={2}
                          className="px-1.5 py-3 text-center border-b border-slate-800 text-[9px] relative group"
                        >
                          ACCIONES
                          {renderResizeHandle("actions")}
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-3 text-left border-b border-slate-800 relative group"
                        >
                          Descripción del Trabajo
                          {renderResizeHandle("description")}
                        </th>

                        {/* CANTIDAD DINAMIC BLOCK */}
                        <th
                          colSpan={5}
                          className="px-3 py-1 text-center bg-slate-805 text-amber-300 font-bold border-l border-slate-750 tracking-wider"
                        >
                          CANTIDADES DE OBRA
                        </th>

                        <th
                          rowSpan={2}
                          className="px-1.5 py-3 text-center border-b border-slate-800 relative group"
                        >
                          Unid.
                          {renderResizeHandle("unid")}
                        </th>
                        <th
                          rowSpan={2}
                          className="px-2 py-3 text-right font-mono border-b border-slate-800 relative group"
                        >
                          P. Unitario
                          <div className="text-[8px] opacity-75 font-normal tracking-wide">
                            ({params.currency || "DOP"})
                          </div>
                          {renderResizeHandle("punit")}
                        </th>

                        {/* VALOR DINAMIC BLOCK */}
                        <th
                          colSpan={3}
                          className="px-3 py-1 text-center bg-blue-950 text-blue-300 font-bold border-l border-slate-800 tracking-wider"
                        >
                          VALORACIÓN ECONÓMICA
                        </th>

                        <th
                          rowSpan={2}
                          className="px-2 py-3 text-center border-b border-slate-800 text-[9px] text-amber-400 relative group leading-tight"
                        >
                          Control<br/>Exceso
                          {renderResizeHandle("excess-control")}
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-3 text-left border-b border-slate-800 relative group"
                        >
                          Observación
                          {renderResizeHandle("observation")}
                        </th>
                      </tr>
                      <tr className="bg-slate-900 text-white text-[8px] font-bold uppercase tracking-wide border-b border-slate-800">
                        {/* Cantidad subheaders */}
                        <th
                          className="px-1 py-1 text-center border-l border-slate-755 font-mono text-slate-355 bg-slate-800 relative group"
                          title="CANT. ESTIM.: Cantidad contratada o estimada original"
                        >
                          Cant. Estim.
                          {renderResizeHandle("cant-estim")}
                        </th>
                        <th
                          className="px-1 py-1 text-center font-mono text-slate-355 bg-slate-800 relative group"
                          title="CANT. ANTERIOR: Suma ejecutada en cortes de pago previos"
                        >
                          Cant. Anterior
                          {renderResizeHandle("cant-anterior")}
                        </th>
                        <th
                          className="px-1 py-1 text-center font-mono text-amber-205 bg-amber-955/40 relative group"
                          title="CANT. ACTUAL: Cantidad ejecutada en el corte seleccionado"
                        >
                          Cant. Actual
                          {renderResizeHandle("cant-actual")}
                        </th>
                        <th
                          className="px-1 py-1 text-center font-mono text-slate-355 bg-slate-800 relative group"
                          title="CANT. ACUMULADA: Anterior + Actual"
                        >
                          Cant. Acum.
                          {renderResizeHandle("cant-acum")}
                        </th>
                        <th
                          className="px-1 py-1 text-center font-mono text-slate-355 bg-slate-805 relative group"
                          title="% AVANCE: Porcentaje ejecutado contra lo estimado"
                        >
                          % Avance
                          {renderResizeHandle("percent-avance")}
                        </th>

                        {/* Valor subheaders */}
                        <th
                          className="px-1.5 py-1 text-right border-l border-slate-800 font-mono text-slate-350 bg-slate-850 relative group"
                          title="VALOR PRESUP.: Presupuestado total"
                        >
                          Valor Presup.
                          <div className="text-[8px] opacity-75 font-normal tracking-wide">
                            ({params.currency || "DOP"})
                          </div>
                          {renderResizeHandle("valor-presup")}
                        </th>
                        <th
                          className="px-1.5 py-1 text-right font-mono text-blue-300 bg-blue-900/40 relative group"
                          title="VALOR ACTUAL: Por pagar en este corte (Actual * P. Unit)"
                        >
                          Valor Actual
                          <div className="text-[8px] opacity-75 font-normal tracking-wide">
                            ({params.currency || "DOP"})
                          </div>
                          {renderResizeHandle("valor-actual")}
                        </th>
                        <th
                          className="px-1.5 py-1 text-right font-mono text-slate-350 bg-slate-850 relative group"
                          title="VALOR ACUMULADO: Acumulada * P. Unit"
                        >
                          Valor Acum.
                          <div className="text-[8px] opacity-75 font-normal tracking-wide">
                            ({params.currency || "DOP"})
                          </div>
                          {renderResizeHandle("valor-acum")}
                        </th>
                      </tr>
                    </>
                  )}
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {Object.entries(groupedRows).map(([subchapterName, val]) => {
                    const rows = val as CalculatedRow[];
                    let subGross = 0;
                    let subPresupVal = 0;
                    let subActualVal = 0;
                    let subAccumVal = 0;

                    rows.forEach((cr) => {
                      subGross += cr.grossValue;
                      subPresupVal += cr.row.quantity * cr.row.priceUnit;
                      const q = getRowQuantities(cr.row.id);
                      subActualVal += q.actual * cr.row.priceUnit;
                      subAccumVal += q.accum * cr.row.priceUnit;
                    });

                    const hasVisibleRows = rows.some((cr) => {
                      const q = getRowQuantities(cr.row.id);
                      const isNoMovementRow = q.actual === 0;
                      return !(isNoMovementRow && hideNoMovement);
                    });

                    return (
                      <React.Fragment key={subchapterName}>
                        {/* Subchapter Title Header Row */}
                        <tr
                          draggable={
                            canDragSubchapter === subchapterName &&
                            selectedReport?.status !== "CERRADO" &&
                            viewMode !== "historico"
                          }
                          onDragStart={(e) =>
                            handleSubchapterDragStart(e, subchapterName)
                          }
                          onDragEnd={() => {
                            setDraggingSubchapter(null);
                            setDragOverSubchapterMoveTarget(null);
                            setCanDragSubchapter(null);
                          }}
                          onDragOver={(e) => {
                            if (draggingSubchapter) {
                              handleSubchapterMoveDragOver(e, subchapterName);
                            } else {
                              handleSubchapterDragOver(e, subchapterName);
                            }
                          }}
                          onDragLeave={() => {
                            if (draggingSubchapter) {
                              handleSubchapterMoveDragLeave();
                            } else {
                              handleSubchapterDragLeave();
                            }
                          }}
                          onDrop={(e) => {
                            if (draggingSubchapter) {
                              handleSubchapterMoveDrop(e, subchapterName);
                            } else {
                              handleDropOnSubchapter(e, subchapterName);
                            }
                          }}
                          className={`bg-slate-100 border-y border-slate-200 transition-colors duration-150 ${
                            draggingSubchapter === subchapterName
                              ? "opacity-40 bg-slate-200"
                              : dragOverSubchapterMoveTarget === subchapterName
                              ? "bg-blue-100 border-blue-400 border-[3px]"
                              : dragOverSubchapter === subchapterName
                              ? "bg-amber-100 border-amber-300"
                              : ""
                          } ${!hasVisibleRows ? "hidden" : ""}`}
                        >
                          <td
                            colSpan={flatColumns.length}
                            className="px-4 py-2 bg-slate-150 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {selectedReport?.status !== "CERRADO" && viewMode !== "historico" && (
                                  <div
                                    onMouseDown={() => {
                                      setCanDragSubchapter(subchapterName);
                                    }}
                                    onMouseUp={() => setCanDragSubchapter(null)}
                                    onMouseLeave={() => {
                                      if (draggingSubchapter !== subchapterName) {
                                        setCanDragSubchapter(null);
                                      }
                                    }}
                                    className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 shrink-0 p-0.5"
                                    title="Arrastrar para ordenar capítulo"
                                  >
                                    <GripVertical size={13} />
                                  </div>
                                )}
                                <span className="flex items-center gap-1.5 font-bold font-mono text-slate-700 tracking-wider text-[10px] uppercase font-sans">
                                  <Layers
                                    size={13}
                                    className="text-blue-600 shrink-0"
                                  />
                                  <span>{subchapterName}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSubchapterName(subchapterName);
                                    setNewSubchapterDraft(subchapterName);
                                    setShowEditSubchapterModal(true);
                                  }}
                                  disabled={
                                    selectedReport?.status === "CERRADO" ||
                                    viewMode === "historico"
                                  }
                                  className="text-slate-400 hover:text-[#2563EB] p-1 hover:bg-slate-200/50 rounded transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                                  title="Renombrar o Modificar este capítulo"
                                >
                                  <Edit2 size={11} />
                                </button>
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono font-bold uppercase select-none">
                                LISTADO LOTE ({rows.length} partidas) | Arrastre
                                {selectedReport?.status !== "CERRADO" && viewMode !== "historico"
                                  ? " el ícono ⠿ para ordenar capítulos, o arrastre filas aquí para agrupar"
                                  : " aquí para mover partidas"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {rows
                          .filter(
                            (cr) =>
                              !(
                                getRowQuantities(cr.row.id).actual === 0 &&
                                hideNoMovement
                              ),
                          )
                          .map((cr, idx) => {
                            const q = getRowQuantities(cr.row.id);
                            const isNoMovementRow = q.actual === 0;
                            const isClosed =
                              selectedReport?.status === "CERRADO" ||
                              viewMode === "historico";
                            const isRowLockedForReport =
                              isReportExtraordinary(selectedReport) &&
                              cr.row.createdReportId !== selectedReport?.id;
                            const isActualQtyDisabled =
                              selectedReport?.status === "CERRADO" ||
                              (isReportExtraordinary(selectedReport)
                                ? cr.row.createdReportId !==
                                    selectedReport?.id &&
                                  cr.row.createdReportId !==
                                    selectedReport?.parentReportId &&
                                  !!cr.row.createdReportId
                                : false);

                            // If the user selected 'historico' display mode inside Excel Compare
                            if (
                              viewMode === "historico" &&
                              activeSheet.contractorId
                            ) {
                              return (
                                <tr
                                  key={cr.row.id || `hist-row-${idx}`}
                                  draggable={
                                    canDragRowId === cr.row.id &&
                                    !isRowLockedForReport
                                  }
                                  onDragStart={(e) =>
                                    handleRowDragStart(e, cr.row.id)
                                  }
                                  onDragOver={(e) =>
                                    handleRowDragOver(e, cr.row.id)
                                  }
                                  onDragLeave={handleRowDragLeave}
                                  onDragEnd={handleRowDragEnd}
                                  onDrop={(e) => handleRowDrop(e, cr.row.id)}
                                  className={`hover:bg-slate-50/50 transition-all align-middle border-b border-slate-100 ${isNoMovementRow && hideNoMovement ? "hidden" : ""} ${isNoMovementRow ? "opacity-55" : ""} ${
                                    draggingRowId === cr.row.id
                                      ? "opacity-40 bg-blue-50/20"
                                      : ""
                                  } ${
                                    dragOverRowId === cr.row.id
                                      ? "border-t-2 border-t-amber-500 bg-amber-50/40"
                                      : ""
                                  }`}
                                >
                                  {/* Seq Number */}
                                  <td className="px-1 py-2.5 text-center font-mono font-bold text-slate-400 bg-slate-50/45 text-[11px] select-none">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <div
                                        onMouseDown={() => {
                                          if (!isRowLockedForReport) {
                                            setCanDragRowId(cr.row.id);
                                          }
                                        }}
                                        onMouseUp={() => setCanDragRowId(null)}
                                        onMouseLeave={() => {
                                          if (draggingRowId !== cr.row.id) {
                                            setCanDragRowId(null);
                                          }
                                        }}
                                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
                                        title="Arrastrar partida"
                                      >
                                        <GripVertical
                                          size={11}
                                          className="animate-pulse"
                                        />
                                      </div>
                                      <span>
                                        {rowSequentialNoMap[cr.row.id] ||
                                          cr.row.no}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="px-2 py-2 text-center font-bold">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDuplicateRow(cr.row)
                                        }
                                        disabled={
                                          isClosed || isRowLockedForReport
                                        }
                                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-all cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
                                        title={
                                          isClosed
                                            ? "No se puede duplicar en reportes cerrados"
                                            : isRowLockedForReport
                                              ? "No se pueden duplicar renglones existentes en reportes extraordinarios"
                                              : "Duplicar partida (Fila)"
                                        }
                                      >
                                        <Copy size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setMeasurementSupportState({ rowId: cr.row.id, type: "quantityActual" })}
                                        className="text-amber-500 hover:text-amber-700 p-1 hover:bg-amber-50 rounded transition-all cursor-pointer flex-shrink-0"
                                        title="Abrir Soporte de Medición / Observaciones"
                                      >
                                        <FileText size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteRowCustom(cr.row.id)
                                        }
                                        className="text-red-500 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-all cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
                                        disabled={
                                          isClosed ||
                                          isRowLockedForReport ||
                                          (cr.row.createdReportId !== selectedReportId &&
                                            !(
                                              !cr.row.createdReportId &&
                                              activeSheet.reports &&
                                              activeSheet.reports.length > 0 &&
                                              activeSheet.reports[0].id === selectedReportId
                                            )) ||
                                          activeSheet.rows.length <= 1
                                        }
                                        title={
                                          isClosed
                                            ? "No se puede eliminar en reportes cerrados"
                                            : isRowLockedForReport
                                              ? "No se pueden eliminar partidas existentes en reportes extraordinarios"
                                              : cr.row.createdReportId !== selectedReportId
                                                ? "Las partidas creadas en reportes anteriores no pueden ser eliminadas, solo copiadas"
                                                : "Eliminar partida"
                                        }
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>

                                  {/* Item description */}
                                  <td className="px-2 py-1 align-top">
                                    <div className="flex flex-col gap-1 w-full">
                                      <AutoResizingTextarea
                                        value={cr.row.description}
                                        data-field="description"
                                        onKeyDown={(e) =>
                                          handleKeyDownEnter(e, "description")
                                        }
                                        onChange={(e) =>
                                          handleCellChangeCustom(
                                            cr.row.id,
                                            "description",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Descripción de la actividad o trabajo realizado"
                                        rows={1}
                                        disabled={
                                          isClosed || isRowLockedForReport || q.prior > 0
                                        }
                                        title={
                                          isClosed
                                            ? "No se puede modificar una hoja cerrada"
                                            : isRowLockedForReport
                                              ? "Las descripciones de renglones existentes están bloqueadas en reportes extraordinarios"
                                              : q.prior > 0
                                                ? "La descripción no puede ser modificada en partidas ya cubicadas en reportes anteriores"
                                                : undefined
                                        }
                                        className="w-full px-2 py-1 bg-white border border-slate-250 hover:border-blue-400 rounded-sm focus:outline-hidden text-[11px] text-slate-800 resize-y whitespace-normal min-h-[24px] block shadow-xs disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                      />
                                    </div>
                                  </td>

                                  {/* Quantity */}
                                  <td className="px-1 py-1 w-[110px]">
                                    <div className="relative w-full">
                                      <AutoResizingTextarea
                                        rows={1}
                                        value={cr.row.quantityFormula ? cr.row.quantityFormula : (cr.row.quantity === 0 ? "" : (cr.row.quantity || 0).toString())}
                                        displayValue={cr.row.quantity === 0 ? "" : (cr.row.quantity || 0).toString()}
                                        data-field="quantity"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleKeyDownEnter(e, "quantity");
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const rawValue = e.target.value;
                                          let numericValue = 0;
                                          if (rawValue.startsWith('=')) {
                                            numericValue = evaluateMathExpression(rawValue.substring(1));
                                          } else {
                                            numericValue = parseFloat(rawValue.replace(/,/g, '')) || 0;
                                          }
                                          const currentFormula = cr.row.quantityFormula || "";
                                          const accepted = handleCellChangeCustom(cr.row.id, "quantity", numericValue, rawValue);
                                          if (!accepted) {
                                            e.target.value = currentFormula || (cr.row.quantity === 0 ? "" : (cr.row.quantity || 0).toString());
                                          }
                                        }}
                                        disabled={isClosed || isRowLockedForReport}
                                        title={
                                          isRowLockedForReport
                                            ? "Las cantidades presupuestadas de renglones existentes están bloqueadas en reportes extraordinarios"
                                            : "Editar cantidad presupuestada"
                                        }
                                        className="w-full px-1.5 py-1 bg-white border border-slate-250 hover:border-blue-400 rounded text-center font-mono font-extrabold text-slate-800 text-[11px] focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed resize-none overflow-hidden"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setMeasurementSupportState({ rowId: cr.row.id, type: "quantity" })}
                                        className={`absolute -left-1.5 -top-1.5 flex items-center justify-center w-3.5 h-3.5 text-white font-extrabold text-[7px] rounded-full shadow-sm cursor-pointer z-10 transition-colors ${
                                          cr.row.quantityFormula
                                            ? "bg-blue-500 hover:bg-blue-600"
                                            : "bg-slate-300 hover:bg-blue-400 opacity-50 hover:opacity-100"
                                        }`}
                                        title={cr.row.quantityFormula ? `Fórmula base: ${cr.row.quantityFormula} - Editar soporte de medición` : "Crear soporte de medición"}
                                      >
                                        ƒx
                                      </button>
                                    </div>
                                  </td>

                                  {/* Measurement Unit */}
                                  <td className="px-1 py-1 font-mono text-center">
                                    <input
                                      type="text"
                                      data-field="unit"
                                      onKeyDown={(e) =>
                                        handleKeyDownEnter(e, "unit")
                                      }
                                      value={cr.row.unit}
                                      onChange={(e) =>
                                        handleCellChangeCustom(
                                          cr.row.id,
                                          "unit",
                                          e.target.value,
                                        )
                                      }
                                      disabled={
                                        isClosed || isRowLockedForReport
                                      }
                                      title={
                                        isRowLockedForReport
                                          ? "Unidades de renglones existentes están bloqueadas en reportes extraordinarios"
                                          : "Editar unidad"
                                      }
                                      className="w-full px-0.5 py-1 bg-white border border-slate-250 hover:border-blue-400 rounded text-center text-[10px] font-bold uppercase disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                      placeholder="m2"
                                    />
                                  </td>

                                  {/* Unitary Price */}
                                  <td className="px-1 py-1 font-mono w-[110px]">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        step="any"
                                        data-field="priceUnit"
                                        onKeyDown={(e) =>
                                          handleKeyDownEnter(e, "priceUnit")
                                        }
                                        onWheel={(e) =>
                                          (
                                            e.currentTarget as HTMLInputElement
                                          ).blur()
                                        }
                                        value={cr.row.priceUnit}
                                        onChange={(e) =>
                                          handleCellChangeCustom(
                                            cr.row.id,
                                            "priceUnit",
                                            e.target.value,
                                          )
                                        }
                                        disabled={
                                          selectedReport?.status === "CERRADO" ||
                                          q.prior > 0 ||
                                          isRowLockedForReport
                                        }
                                        title={
                                          selectedReport?.status === "CERRADO"
                                            ? "El reporte actual está cerrado"
                                            : isRowLockedForReport
                                              ? "Los precios unitarios de renglones existentes están bloqueados en reportes extraordinarios"
                                              : q.prior > 0
                                                ? "No se puede modificar precio unitario: ya tiene cantidades acumuladas de reportes anteriores"
                                                : "Editar precio unitario"
                                        }
                                        className={`flex-1 min-w-0 px-1 py-1 text-right font-mono font-bold text-[11px] focus:outline-hidden rounded border transition-colors ${
                                          selectedReport?.status === "CERRADO" ||
                                          q.prior > 0 ||
                                          isRowLockedForReport
                                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                            : "bg-white border-slate-250 hover:border-blue-400 text-blue-955"
                                        }`}
                                      />
                                      {activeContractor && !(selectedReport?.status === "CERRADO" || q.prior > 0 || isRowLockedForReport) && (
                                        <button
                                          type="button"
                                          onClick={() => handleInlineRowSuggest(cr.row)}
                                          disabled={isInlineSuggestingRowId === cr.row.id}
                                          className="shrink-0 p-1 bg-gradient-to-tr from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 disabled:from-slate-400 disabled:to-slate-400 text-white rounded shadow-sm cursor-pointer transition-all focus:outline-hidden"
                                          title="Sugerir precio basado en acuerdos con IA"
                                        >
                                          {isInlineSuggestingRowId === cr.row.id ? (
                                            <RefreshCw size={9} className="animate-spin" />
                                          ) : (
                                            <Sparkles size={9} />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  {/* Calculated Gross Value */}
                                  <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono bg-slate-50/20">
                                    {formatCurrencyValue(
                                      cr.grossValue,
                                      params.currency,
                                    )}
                                  </td>

                                  {/* Dynamic Historical Periods cells */}
                                  {(activeSheet.reports || []).map(
                                    (r, sIdx) => {
                                      const isColCollapsed =
                                        !!collapsedPeriods[r.id];
                                      if (isColCollapsed) {
                                        return (
                                          <td
                                            key={`cell-${r.id}`}
                                            className="px-1 py-1 bg-slate-100 text-center font-mono text-[10px] text-slate-400 border-l border-slate-200"
                                          >
                                            -
                                          </td>
                                        );
                                      }

                                      const rQty = r.quantities[cr.row.id] ?? 0;
                                      const rVal = rQty * cr.row.priceUnit;
                                      const isCurrentReport =
                                        r.id === selectedReportId;

                                      return (
                                        <React.Fragment key={`cell-${r.id}`}>
                                          {/* Quantity cell */}
                                          <td
                                            className={`px-1 py-1 text-center font-mono border-l border-slate-200 text-[11px] ${isCurrentReport ? "bg-amber-50/15 w-[110px]" : "bg-slate-100/10 text-slate-600"}`}
                                          >
                                            {isCurrentReport ? (
                                              <div className="relative">
                                                <AutoResizingTextarea
                                                  rows={1}
                                                  value={selectedReport?.formulas?.[cr.row.id] ? selectedReport.formulas[cr.row.id] : (q.actual === 0 ? "" : (q.actual || 0).toString())}
                                                  displayValue={q.actual === 0 ? "" : (q.actual || 0).toString()}
                                                  data-field="quantityActual"
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleKeyDownEnter(e, "quantityActual");
                                                  }
                                                }}
                                                onBlur={(e) => {
                                                  const rawValue = e.target.value;
                                                  let numericValue = 0;
                                                  if (rawValue.startsWith('=')) {
                                                    numericValue = evaluateMathExpression(rawValue.substring(1));
                                                  } else {
                                                    numericValue = parseFloat(rawValue.replace(/,/g, '')) || 0;
                                                  }
                                                  
                                                  // Always update if it doesn't match the active state perfectly, or if a formula changes
                                                  const currentFormula = selectedReport?.formulas?.[cr.row.id] || "";
                                                  const isFormulaChanged = rawValue !== currentFormula && rawValue.startsWith('=');
                                                  const isFormulaRemoved = !rawValue.startsWith('=') && currentFormula !== "";
                                                  
                                                  const accepted = handleCellChangeCustom(cr.row.id, "quantityActual", numericValue, rawValue);
                                                  if (!accepted) {
                                                     e.target.value = currentFormula || (q.actual === 0 ? "" : (q.actual || 0).toString());
                                                  }
                                                }}
                                                placeholder={
                                                  isActualQtyDisabled
                                                    ? "Bloqueado"
                                                    : "0"
                                                }
                                                className={`w-full px-1.5 py-1 text-center font-mono text-[11px] rounded focus:ring-1 focus:ring-amber-400 border disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-hidden ${
                                                  isActualQtyDisabled
                                                    ? "bg-slate-100 border-slate-200 text-slate-400 font-semibold"
                                                    : "bg-white border-amber-300 hover:border-amber-500 font-black text-amber-900"
                                                }`}
                                                disabled={isActualQtyDisabled}
                                                title={
                                                  isActualQtyDisabled
                                                    ? "Este renglón no fue creado en este reporte extraordinario ni pertenece al reporte principal superior, por lo tanto está bloqueado."
                                                    : "Cantidad ejecutada en este corte (Soporta fórmulas ej: =5+5*2)"
                                                }
                                              />
                                              <button
                                                type="button"
                                                onClick={() => setMeasurementSupportState({ rowId: cr.row.id, type: "quantityActual" })}
                                                className={`absolute -left-1.5 -top-1.5 flex items-center justify-center w-3.5 h-3.5 text-white font-extrabold text-[7px] rounded-full shadow-sm cursor-pointer z-10 transition-colors ${
                                                  selectedReport?.formulas?.[cr.row.id] 
                                                    ? "bg-amber-500 hover:bg-amber-600" 
                                                    : "bg-slate-300 hover:bg-amber-400 opacity-50 hover:opacity-100"
                                                }`}
                                                title={selectedReport?.formulas?.[cr.row.id] ? `Fórmula actual: ${selectedReport.formulas[cr.row.id]} - Editar soporte de medición` : "Crear soporte de medición"}
                                              >
                                                ƒx
                                              </button>
                                              </div>
                                            ) : rQty === 0 ? (
                                              <span className="text-slate-300">
                                                -
                                              </span>
                                            ) : (
                                              <span>
                                                {formatQuantityDisplay(rQty)}
                                              </span>
                                            )}
                                          </td>
                                          {/* Value cell */}
                                          <td
                                            className={`px-2 py-1 text-right font-mono font-medium text-[11px] ${isCurrentReport ? "bg-amber-100/20 text-slate-950 font-bold font-sans" : "bg-slate-100/25 text-slate-600"}`}
                                          >
                                            {rVal === 0 ? (
                                              <span className="text-slate-305">
                                                -
                                              </span>
                                            ) : (
                                              <span>
                                                {formatCurrencyValue(
                                                  rVal,
                                                  params.currency,
                                                )}
                                              </span>
                                            )}
                                          </td>
                                        </React.Fragment>
                                      );
                                    },
                                  )}

                                  {/* Accumulated columns */}
                                  {(() => {
                                    const isAcumCollapsed =
                                      !!collapsedPeriods["acumulado"];
                                    if (isAcumCollapsed) {
                                      return (
                                        <td className="px-1 py-1 bg-slate-100 text-center font-mono text-[10px] text-slate-400 border-l border-slate-200">
                                          -
                                        </td>
                                      );
                                    }
                                    const accum = getAccumulatedStats(
                                      cr.row.id,
                                    );
                                    const pct = cr.row.quantity > 0 ? (accum.qty / cr.row.quantity) * 100 : 0;
                                    return (
                                      <>
                                        <td className="px-2 py-1 text-center font-mono font-extrabold border-l border-teal-200/50 bg-teal-50/20 text-teal-800 text-[11px]">
                                          {accum.qty === 0 ? (
                                            <span className="text-slate-300">
                                              -
                                            </span>
                                          ) : (
                                            <span>
                                              {formatQuantityDisplay(accum.qty)}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-1 py-1 text-center bg-teal-50/20 border-teal-200/50 border-x">
                                          <span className={`font-mono text-[10px] font-extrabold px-1 py-0.5 rounded-sm ${pct > 100 ? "bg-rose-50 text-rose-700 border border-rose-200" : pct === 100 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : pct > 0 ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-400"}`}>
                                            {pct.toFixed(1)}%
                                          </span>
                                        </td>
                                        <td className="px-2 py-1 text-right font-mono font-bold bg-teal-50/35 text-teal-955 border-r border-teal-200/10 text-[11px]">
                                          {accum.val === 0 ? (
                                            <span className="text-slate-305">
                                              -
                                            </span>
                                          ) : (
                                            <span className="text-teal-955 font-extrabold">
                                              {formatCurrencyValue(
                                                accum.val,
                                                params.currency,
                                              )}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-1 py-1 text-center border-r border-teal-200/50 bg-teal-50/20">
                                          <div className="flex flex-col items-center justify-center space-y-0.5">
                                            {accum.qty > cr.row.quantity ? (
                                              <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[9px] px-1 py-0.2 rounded font-black tracking-tighter shrink-0" title={`Supera presupuesto por ${formatQuantityDisplay(accum.qty - cr.row.quantity)}`}>
                                                Exceso: +{formatQuantityDisplay(accum.qty - cr.row.quantity)}
                                              </span>
                                            ) : (
                                              <span className="text-[9px] text-slate-400 font-mono">Ok</span>
                                            )}
                                            <label className={`flex items-center gap-1 select-none ${(!selectedReport || selectedReport.status === "CERRADO") || isRowLockedForReport ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                              <input
                                                type="checkbox"
                                                checked={!!(cr.row as any).authorized}
                                                onChange={() => toggleAuthorizeRow(cr.row.id)}
                                                disabled={(!selectedReport || selectedReport.status === "CERRADO") || isRowLockedForReport}
                                                title={isRowLockedForReport ? "La autorización de renglones existentes está bloqueada en reportes extraordinarios" : "Autorizar/desautorizar"}
                                                className={`w-3.5 h-3.5 text-emerald-600 border-slate-350 rounded ${(!selectedReport || selectedReport.status === "CERRADO") || isRowLockedForReport ? "cursor-not-allowed" : "cursor-pointer"}`}
                                              />
                                              <span className="text-[9px] font-bold text-slate-500">AUT</span>
                                            </label>
                                          </div>
                                        </td>
                                      </>
                                    );
                                  })()}

                                  {/* Observations */}
                                  <td className="px-1.5 py-1">
                                    <AutoResizingTextarea
                                      value={cr.row.observations || ""}
                                      data-field="observations"
                                      onKeyDown={(e) =>
                                        handleKeyDownEnter(e, "observations")
                                      }
                                      onChange={(e) =>
                                        handleCellChangeCustom(
                                          cr.row.id,
                                          "observations",
                                          e.target.value,
                                        )
                                      }
                                      disabled={
                                        isClosed || isRowLockedForReport
                                      }
                                      title={
                                        isRowLockedForReport
                                          ? "Las observaciones de renglones existentes están bloqueadas en reportes extraordinarios"
                                          : undefined
                                      }
                                      placeholder="Notas..."
                                      rows={1}
                                      className="w-full px-1.5 py-1 bg-white border border-slate-200 hover:border-blue-400 rounded text-[11px] resize-y whitespace-normal min-h-[24px] block disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-550 disabled:cursor-not-allowed"
                                    />
                                  </td>
                                </tr>
                              );
                            }

                            // ELSE: STANDARD CUMULATIVE MULTI-BLOCK CUBICACIONES VIEW
                            return (
                              <tr
                                key={cr.row.id || `std-row-${idx}`}
                                draggable={
                                  canDragRowId === cr.row.id &&
                                  !isRowLockedForReport
                                }
                                onDragStart={(e) =>
                                  handleRowDragStart(e, cr.row.id)
                                }
                                onDragOver={(e) =>
                                  handleRowDragOver(e, cr.row.id)
                                }
                                onDragLeave={handleRowDragLeave}
                                onDragEnd={handleRowDragEnd}
                                onDrop={(e) => handleRowDrop(e, cr.row.id)}
                                className={`hover:bg-slate-50/50 transition-all align-middle border-b border-slate-100 ${isNoMovementRow && hideNoMovement ? "hidden" : ""} ${isNoMovementRow ? "bg-slate-50/30 font-medium opacity-60" : ""} ${
                                  draggingRowId === cr.row.id
                                    ? "opacity-40 bg-blue-50/20"
                                    : ""
                                } ${
                                  dragOverRowId === cr.row.id
                                    ? "border-t-2 border-t-amber-500 bg-amber-50/40"
                                    : ""
                                }`}
                              >
                                {/* Seq Number */}
                                <td className="px-1 py-2.5 text-center font-mono font-bold text-slate-400 bg-slate-50/45 text-[11px] select-none">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div
                                      onMouseDown={() => {
                                        if (!isRowLockedForReport) {
                                          setCanDragRowId(cr.row.id);
                                        }
                                      }}
                                      onMouseUp={() => setCanDragRowId(null)}
                                      onMouseLeave={() => {
                                        if (draggingRowId !== cr.row.id) {
                                          setCanDragRowId(null);
                                        }
                                      }}
                                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
                                      title="Arrastrar partida"
                                    >
                                      <GripVertical
                                        size={11}
                                        className="animate-pulse"
                                      />
                                    </div>
                                    <span>
                                      {rowSequentialNoMap[cr.row.id] ||
                                        cr.row.no}
                                    </span>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="px-1 py-1 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateRow(cr.row)}
                                      disabled={
                                        isClosed || isRowLockedForReport
                                      }
                                      className="text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-50 rounded cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
                                      title={
                                        isClosed
                                          ? "No se puede duplicar en reportes cerrados"
                                          : isRowLockedForReport
                                            ? "No se puede duplicar renglones existentes en reportes extraordinarios"
                                            : "Duplicar"
                                      }
                                    >
                                      <Copy size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteRowCustom(cr.row.id)
                                      }
                                      className="text-red-500 hover:text-red-800 p-0.5 hover:bg-red-50 rounded cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
                                      disabled={
                                        isClosed ||
                                        isRowLockedForReport ||
                                        (cr.row.createdReportId !== selectedReportId &&
                                          !(
                                            !cr.row.createdReportId &&
                                            activeSheet.reports &&
                                            activeSheet.reports.length > 0 &&
                                            activeSheet.reports[0].id === selectedReportId
                                          )) ||
                                        activeSheet.rows.length <= 1
                                      }
                                      title={
                                        isClosed
                                          ? "No se puede eliminar en reportes cerrados"
                                          : isRowLockedForReport
                                            ? "No se puede eliminar renglones existentes en reportes extraordinarios"
                                            : cr.row.createdReportId !== selectedReportId
                                              ? "Las partidas creadas en reportes anteriores no pueden ser eliminadas, solo copiadas"
                                              : "Eliminar"
                                      }
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>

                                {/* Item description */}
                                <td className="px-2 py-1 align-top">
                                  <div className="flex flex-col gap-1 w-full">
                                    <AutoResizingTextarea
                                      value={cr.row.description}
                                      data-field="description"
                                      onKeyDown={(e) =>
                                        handleKeyDownEnter(e, "description")
                                      }
                                      onChange={(e) =>
                                        handleCellChangeCustom(
                                          cr.row.id,
                                          "description",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Descripción de la actividad o trabajo realizado"
                                      rows={1}
                                      disabled={
                                        isClosed || isRowLockedForReport || q.prior > 0
                                      }
                                      title={
                                        isClosed
                                          ? "No se puede modificar una hoja cerrada"
                                          : isRowLockedForReport
                                            ? "Las descripciones de renglones existentes están bloqueadas en reportes extraordinarios"
                                            : q.prior > 0
                                              ? "La descripción no puede ser modificada en partidas ya cubicadas en reportes anteriores"
                                              : undefined
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-250 hover:border-blue-400 rounded-sm focus:outline-hidden text-[11px] text-slate-800 resize-y whitespace-normal min-h-[24px] block shadow-xs disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    />
                                  </div>
                                </td>

                                {/* 1. CANT. ESTIM. */}
                                <td className="px-1 py-1 w-[110px]">
                                  <div className="relative w-full">
                                    <AutoResizingTextarea
                                      rows={1}
                                      value={cr.row.quantityFormula ? cr.row.quantityFormula : (cr.row.quantity === 0 ? "" : (cr.row.quantity || 0).toString())}
                                      displayValue={cr.row.quantity === 0 ? "" : (cr.row.quantity || 0).toString()}
                                    data-field="quantity"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleKeyDownEnter(e, "quantity");
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const rawValue = e.target.value;
                                      let numericValue = 0;
                                      if (rawValue.startsWith('=')) {
                                        numericValue = evaluateMathExpression(rawValue.substring(1));
                                      } else {
                                        numericValue = parseFloat(rawValue.replace(/,/g, '')) || 0;
                                      }
                                      
                                      const currentFormula = cr.row.quantityFormula || "";
                                      const isFormulaChanged = rawValue !== currentFormula && rawValue.startsWith('=');
                                      const isFormulaRemoved = !rawValue.startsWith('=') && currentFormula !== "";
                                      
                                      const accepted = handleCellChangeCustom(cr.row.id, "quantity", numericValue, rawValue);
                                      if (!accepted) {
                                        e.target.value = currentFormula || (cr.row.quantity === 0 ? "" : (cr.row.quantity || 0).toString());
                                      }
                                    }}
                                    disabled={isClosed || isRowLockedForReport}
                                    title={
                                      isRowLockedForReport
                                        ? "Las cantidades presupuestadas de renglones existentes están bloqueadas en reportes extraordinarios"
                                        : "Editar cantidad presupuestada"
                                    }
                                    className="w-full px-1.5 py-1 bg-white border border-slate-250 hover:border-blue-400 rounded text-center font-mono font-extrabold text-slate-800 text-[11px] focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed resize-none overflow-hidden"
                                  />
                                    <button
                                      type="button"
                                      onClick={() => setMeasurementSupportState({ rowId: cr.row.id, type: "quantity" })}
                                      className={`absolute -left-1.5 -top-1.5 flex items-center justify-center w-3.5 h-3.5 text-white font-extrabold text-[7px] rounded-full shadow-sm cursor-pointer z-10 transition-colors ${
                                        cr.row.quantityFormula
                                          ? "bg-blue-500 hover:bg-blue-600"
                                          : "bg-slate-300 hover:bg-blue-400 opacity-50 hover:opacity-100"
                                      }`}
                                      title={cr.row.quantityFormula ? `Fórmula base: ${cr.row.quantityFormula} - Editar soporte de medición` : "Crear soporte de medición"}
                                    >
                                      ƒx
                                    </button>
                                  </div>
                                </td>

                                {/* 2. CANT. ANTERIOR */}
                                <td className="px-1 py-1 text-center bg-slate-50/50">
                                  <span className="font-mono text-[11px] font-semibold text-slate-500 block">
                                    {q.prior === 0 ? "-" : formatQuantityDisplay(q.prior)}
                                  </span>
                                </td>

                                {/* 3. CANT. ACTUAL */}
                                <td className="px-1 py-1 bg-amber-50/15 w-[110px]">
                                  <div className="relative w-full">
                                    <AutoResizingTextarea
                                      rows={1}
                                      value={selectedReport?.formulas?.[cr.row.id] ? selectedReport.formulas[cr.row.id] : (q.actual === 0 ? "" : (q.actual || 0).toString())}
                                      displayValue={q.actual === 0 ? "" : (q.actual || 0).toString()}
                                    data-field="quantityActual"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleKeyDownEnter(e, "quantityActual");
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const rawValue = e.target.value;
                                      let numericValue = 0;
                                      if (rawValue.startsWith('=')) {
                                        numericValue = evaluateMathExpression(rawValue.substring(1));
                                      } else {
                                        numericValue = parseFloat(rawValue.replace(/,/g, '')) || 0;
                                      }
                                      
                                      const currentFormula = selectedReport?.formulas?.[cr.row.id] || "";
                                      
                                      const accepted = handleCellChangeCustom(cr.row.id, "quantityActual", numericValue, rawValue);
                                      if (!accepted) {
                                         e.target.value = currentFormula || (q.actual === 0 ? "" : (q.actual || 0).toString());
                                      }
                                    }}
                                    className={`w-full px-1.5 py-1 text-center font-mono text-[11px] rounded focus:ring-1 focus:ring-amber-400 border disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-hidden ${
                                      isActualQtyDisabled
                                        ? "bg-slate-100 border-slate-200 text-slate-400 font-semibold"
                                        : "bg-white border-amber-300 hover:border-amber-500 font-black text-amber-900"
                                    }`}
                                    disabled={isActualQtyDisabled}
                                    title={
                                      isActualQtyDisabled
                                        ? "Este renglón no fue creado en este reporte extraordinario ni pertenece al reporte principal superior, por lo tanto está bloqueado."
                                        : "Cantidad ejecutada en este corte"
                                    }
                                  />
                                    <button
                                      type="button"
                                      onClick={() => setMeasurementSupportState({ rowId: cr.row.id, type: "quantityActual" })}
                                      className={`absolute -left-1.5 -top-1.5 flex items-center justify-center w-3.5 h-3.5 text-white font-extrabold text-[7px] rounded-full shadow-sm cursor-pointer z-10 transition-colors ${
                                        selectedReport?.formulas?.[cr.row.id]
                                          ? "bg-amber-500 hover:bg-amber-600"
                                          : "bg-slate-300 hover:bg-amber-400 opacity-50 hover:opacity-100"
                                      }`}
                                      title={selectedReport?.formulas?.[cr.row.id] ? `Fórmula actual: ${selectedReport.formulas[cr.row.id]} - Editar soporte de medición` : "Crear soporte de medición"}
                                    >
                                      ƒx
                                    </button>
                                  </div>
                                </td>

                                {/* 4. CANT. ACUMULADA */}
                                <td className="px-1 py-1 text-center bg-slate-100/40">
                                  <span className="font-mono text-[11px] font-black text-slate-900 block">
                                    {q.accum === 0 ? "0" : formatQuantityDisplay(q.accum)}
                                  </span>
                                </td>

                                {/* 5. % AVANCE */}
                                <td className="px-1 py-1 text-center">
                                  <span
                                    className={`font-mono text-[10px] font-extrabold px-1 py-0.2 rounded-sm ${
                                      q.pct > 100
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : q.pct === 100
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : q.pct > 0
                                            ? "bg-blue-50 text-blue-700 border border-blue-250"
                                            : "text-slate-400"
                                    }`}
                                  >
                                    {q.pct.toFixed(1)}%
                                  </span>
                                </td>

                                {/* Measurement Unit */}
                                <td className="px-1 py-1 font-mono text-center">
                                  <input
                                    type="text"
                                    data-field="unit"
                                    onKeyDown={(e) =>
                                      handleKeyDownEnter(e, "unit")
                                    }
                                    value={cr.row.unit}
                                    onChange={(e) =>
                                      handleCellChangeCustom(
                                        cr.row.id,
                                        "unit",
                                        e.target.value,
                                      )
                                    }
                                    disabled={isClosed || isRowLockedForReport}
                                    title={
                                      isRowLockedForReport
                                        ? "Unidades de renglones existentes están bloqueadas en reportes extraordinarios"
                                        : "Editar unidad"
                                    }
                                    className="w-full px-0.5 py-1 bg-white border border-slate-250 hover:border-blue-400 rounded text-center text-[10px] font-bold uppercase disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                    placeholder="m2"
                                  />
                                </td>

                                {/* Unitary Price */}
                                <td className="px-1 py-1 font-mono w-[110px]">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="any"
                                      data-field="priceUnit"
                                      onKeyDown={(e) =>
                                        handleKeyDownEnter(e, "priceUnit")
                                      }
                                      onWheel={(e) =>
                                        (
                                          e.currentTarget as HTMLInputElement
                                        ).blur()
                                      }
                                      value={cr.row.priceUnit}
                                      onChange={(e) =>
                                        handleCellChangeCustom(
                                          cr.row.id,
                                          "priceUnit",
                                          e.target.value,
                                        )
                                      }
                                      disabled={
                                        selectedReport?.status === "CERRADO" ||
                                        q.prior > 0 ||
                                        isRowLockedForReport
                                      }
                                      title={
                                        selectedReport?.status === "CERRADO"
                                          ? "El reporte actual está cerrado"
                                          : isRowLockedForReport
                                            ? "Los precios unitarios de renglones existentes están bloqueados en reportes extraordinarios"
                                            : q.prior > 0
                                              ? "No se puede modificar precio unitario: ya tiene cantidades acumuladas de reportes anteriores"
                                              : "Editar precio unitario"
                                      }
                                      className={`flex-1 min-w-0 px-1 py-1 text-right font-mono font-bold text-[11px] rounded border transition-colors ${
                                        selectedReport?.status === "CERRADO" ||
                                        q.prior > 0 ||
                                        isRowLockedForReport
                                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                          : "bg-white border-slate-250 hover:border-blue-400 text-blue-955"
                                      }`}
                                    />
                                    {activeContractor && !(selectedReport?.status === "CERRADO" || q.prior > 0 || isRowLockedForReport) && (
                                      <button
                                        type="button"
                                        onClick={() => handleInlineRowSuggest(cr.row)}
                                        disabled={isInlineSuggestingRowId === cr.row.id}
                                        className="shrink-0 p-1 bg-gradient-to-tr from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 disabled:from-slate-400 disabled:to-slate-400 text-white rounded shadow-sm cursor-pointer transition-all focus:outline-hidden"
                                        title="Sugerir precio basado en acuerdos con IA"
                                      >
                                        {isInlineSuggestingRowId === cr.row.id ? (
                                          <RefreshCw size={9} className="animate-spin" />
                                        ) : (
                                          <Sparkles size={9} />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* 1. VALOR PRESUPUESTADO */}
                                <td className="px-2 py-1 text-right font-mono bg-slate-50/50 text-[11px] text-slate-600">
                                  {formatCurrencyValue(
                                    cr.row.quantity * cr.row.priceUnit,
                                    params.currency,
                                  )}
                                </td>

                                {/* 2. VALOR ACTUAL */}
                                <td className="px-2 py-1 text-right font-mono bg-blue-50/20 text-[11px] text-blue-800 font-bold">
                                  {formatCurrencyValue(
                                    q.actual * cr.row.priceUnit,
                                    params.currency,
                                  )}
                                </td>

                                {/* 3. VALOR ACUMULADO */}
                                <td className="px-2 py-1 text-right font-mono text-[11px] text-slate-805 font-semibold bg-slate-100">
                                  {formatCurrencyValue(
                                    q.accum * cr.row.priceUnit,
                                    params.currency,
                                  )}
                                </td>

                                {/* Control Exceso */}
                                <td className="px-1 py-1 text-center">
                                  <div className="flex flex-col items-center justify-center space-y-0.5">
                                    {q.isExcess ? (
                                      <span
                                        className="bg-rose-100 text-rose-800 border border-rose-300 text-[9px] px-1 py-0.2 rounded font-black tracking-tighter shrink-0"
                                        title={`Supera presupuesto por ${formatQuantityDisplay(q.accum - cr.row.quantity)}`}
                                      >
                                        Exceso: +
                                        {formatQuantityDisplay(q.accum - cr.row.quantity)}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        Ok
                                      </span>
                                    )}
                                    <label
                                      className={`flex items-center gap-1 select-none ${isClosed || isRowLockedForReport ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={!!(cr.row as any).authorized}
                                        onChange={() =>
                                          toggleAuthorizeRow(cr.row.id)
                                        }
                                        disabled={
                                          isClosed || isRowLockedForReport
                                        }
                                        title={
                                          isRowLockedForReport
                                            ? "La autorización de renglones existentes está bloqueada en reportes extraordinarios"
                                            : "Autorizar/desautorizar"
                                        }
                                        className={`w-3.5 h-3.5 text-emerald-600 border-slate-350 rounded ${isClosed || isRowLockedForReport ? "cursor-not-allowed" : "cursor-pointer"}`}
                                      />
                                      <span className="text-[9px] font-bold text-slate-500">
                                        AUT
                                      </span>
                                    </label>
                                  </div>
                                </td>

                                {/* Observation */}
                                <td className="px-1.5 py-1">
                                  <AutoResizingTextarea
                                    value={cr.row.observations || ""}
                                    data-field="observations"
                                    onKeyDown={(e) =>
                                      handleKeyDownEnter(e, "observations")
                                    }
                                    onChange={(e) =>
                                      handleCellChangeCustom(
                                        cr.row.id,
                                        "observations",
                                        e.target.value,
                                      )
                                    }
                                    disabled={isClosed || isRowLockedForReport}
                                    title={
                                      isRowLockedForReport
                                        ? "Las observaciones de renglones existentes están bloqueadas en reportes extraordinarios"
                                        : undefined
                                    }
                                    placeholder="Notas..."
                                    rows={1}
                                    className="w-full px-1.5 py-1 bg-white border border-slate-200 hover:border-blue-400 rounded text-[11px] resize-y whitespace-normal min-h-[24px] block disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-550 disabled:cursor-not-allowed"
                                  />
                                </td>
                              </tr>
                            );
                          })}

                        {/* Subchapter Summary Totals */}
                        <tr className="bg-slate-50 font-semibold text-[10px] text-slate-500 border-b border-slate-200 uppercase font-sans">
                          <td
                            colSpan={1}
                            className="px-3 py-2 text-[9px] text-slate-400 text-left font-mono bg-slate-100/30"
                          >
                            SUBTOTAL SECCIÓN
                          </td>
                          <td
                            colSpan={viewMode === "historico" ? 5 : 9}
                            className="px-2 py-2 text-right tracking-tight font-bold text-slate-650"
                          >
                            Subtotal {subchapterName}:
                          </td>

                          {viewMode === "historico" ? (
                            <>
                              <td className="px-3 py-2 text-right font-mono font-black text-slate-900 bg-slate-100/90 text-xs">
                                {formatCurrencyValue(subGross, params.currency)}
                              </td>
                              <td colSpan={columnsAfterGross} />
                            </>
                          ) : (
                            <>
                              {/* Presupuestado subtotal */}
                              <td className="px-1.5 py-2 text-right font-mono font-bold text-slate-500">
                                {formatCurrencyValue(
                                  subPresupVal,
                                  params.currency,
                                )}
                              </td>
                              {/* Actual subtotal */}
                              <td className="px-1.5 py-2 text-right font-mono font-black text-blue-800 bg-blue-50/30">
                                {formatCurrencyValue(
                                  subActualVal,
                                  params.currency,
                                )}
                              </td>
                              {/* Acumulado subtotal */}
                              <td className="px-1.5 py-2 text-right font-mono font-bold text-slate-900 bg-slate-100">
                                {formatCurrencyValue(
                                  subAccumVal,
                                  params.currency,
                                )}
                              </td>
                              <td colSpan={2} />
                            </>
                          )}
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* Summary aggregate Totals footer of sheets */}
                  {viewMode === "historico" && activeSheet.contractorId ? (
                    <tr className="bg-[#1E293B] text-white font-bold text-[11px] uppercase">
                      <td colSpan={1} className="px-4 py-3 text-left">
                        GRAN TOTAL VALOR BRUTO
                      </td>
                      <td
                        colSpan={5}
                        className="px-2 py-3 text-right text-[10px] text-slate-400"
                      >
                        SUMADOS AUTOMÁTICOS DE LOTE
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-emerald-300 font-extrabold text-xs bg-[#0F172A] border-y border-emerald-500/20">
                        {formatCurrencyValue(
                          sheetTotals.gross,
                          params.currency,
                        )}
                      </td>
                      <td colSpan={columnsAfterGross} />
                    </tr>
                  ) : (
                    <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase border-t-2 border-slate-750">
                      <td colSpan={1} className="px-4 py-3 text-left">
                        GRAN TOTAL VALORACIONES
                      </td>
                      <td
                        colSpan={9}
                        className="px-2 py-3 text-right text-[9px] text-slate-400"
                      >
                        SUMADO DE PARTIDAS ACTIVAS
                      </td>

                      {/* Presupuestado Grand Total */}
                      <td className="px-1.5 py-3 text-right font-mono text-slate-300 text-[11px] bg-[#0F172A]/70">
                        {formatCurrencyValue(
                          calculatedRows.reduce(
                            (acc, curr) =>
                              acc + curr.row.quantity * curr.row.priceUnit,
                            0,
                          ),
                          params.currency,
                        )}
                      </td>

                      {/* Actual Grand Total */}
                      <td className="px-1.5 py-3 text-right font-mono text-emerald-300 font-extrabold text-[11px] bg-[#0F172A]">
                        {formatCurrencyValue(subtotalActual, params.currency)}
                      </td>

                      {/* Acumulado Grand Total */}
                      <td className="px-1.5 py-3 text-right font-mono text-slate-300 text-[11px] bg-[#0F172A]/70">
                        {formatCurrencyValue(
                          calculatedRows.reduce((acc, curr) => {
                            const q = getRowQuantities(curr.row.id);
                            return acc + q.accum * curr.row.priceUnit;
                          }, 0),
                          params.currency,
                        )}
                      </td>

                      <td colSpan={2} className="bg-slate-900" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>



            {/* Quick Actions at bottom of list */}
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex items-center justify-between flex-wrap gap-4">
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                <span>
                  Las retenciones de Ley (ISR, TSS) e ITBIS se alimentan
                  dinámicamente. Al crear filas, heredará automáticamente la
                  sección anterior.
                </span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewSubchapterDraft("");
                    setShowCreateSubchapterModal(true);
                  }}
                  disabled={
                    selectedReport?.status === "CERRADO" ||
                    viewMode === "historico"
                  }
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all border border-slate-700 cursor-pointer disabled:bg-slate-350 disabled:border-slate-450"
                  title="Crear un nuevo capítulo / sección (ej: Primer Nivel, Segundo Nivel, etc.)"
                >
                  <PlusCircle size={14} className="text-[#34D399]" />
                  <span>Crear Capítulo</span>
                </button>

                <button
                  onClick={handleAddNewRow}
                  disabled={
                    selectedReport?.status === "CERRADO" ||
                    viewMode === "historico"
                  }
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1 shadow-sm transition-all border border-blue-700 disabled:bg-slate-350 disabled:border-slate-400"
                  title={
                    selectedReport?.status === "CERRADO"
                      ? "El reporte actual está cerrado. No se pueden agregar renglones."
                      : viewMode === "historico"
                        ? "No se pueden agregar renglones en la vista comparativa histórica."
                        : "Agregar Renglón (Fila)"
                  }
                >
                  <Plus size={14} />
                  <span>Agregar Renglón (Fila)</span>
                </button>
              </div>
            </div>
          </div>

          {/* LIQUIDACIÓN Y COTEJO DE RETENCIONES */}
          {(() => {
            const isReportClosed = selectedReport?.status === "CERRADO" || viewMode === "historico";

            const effCheckedIsr = isReportClosed && selectedReport?.savedApplyIsr !== undefined
              ? selectedReport.savedApplyIsr
              : activeSheet.applyIsr !== false;

            const effPercentIsr = isReportClosed && selectedReport?.savedPercentIsr !== undefined
              ? selectedReport.savedPercentIsr
              : params.percentIsr;

            const effCheckedTss = isReportClosed && selectedReport?.savedApplyTss !== undefined
              ? selectedReport.savedApplyTss
              : activeSheet.applyTss !== false;

            const effPercentTss = isReportClosed && selectedReport?.savedPercentTss !== undefined
              ? selectedReport.savedPercentTss
              : params.percentTss;

            const effCheckedPension = isReportClosed && selectedReport?.savedApplyPension !== undefined
              ? selectedReport.savedApplyPension
              : activeSheet.applyPension !== false;

            const effPercentPension = isReportClosed && selectedReport?.savedPercentPension !== undefined
              ? selectedReport.savedPercentPension
              : params.percentPension;

            const effCheckedWarranty = isReportClosed && selectedReport?.savedApplyWarranty !== undefined
              ? selectedReport.savedApplyWarranty
              : activeSheet.applyWarranty !== false;

            const effPercentWarranty = isReportClosed && selectedReport?.savedPercentWarranty !== undefined
              ? selectedReport.savedPercentWarranty
              : params.percentWarranty;

            const effCheckedItbis = isReportClosed && selectedReport?.savedApplyItbis !== undefined
              ? selectedReport.savedApplyItbis
              : activeSheet.applyItbis === true;

            const effPercentItbis = isReportClosed && selectedReport?.savedPercentItbis !== undefined
              ? selectedReport.savedPercentItbis
              : params.percentItbis;

            const effItbisRateForSheet = isReportClosed && selectedReport?.savedItbisRate !== undefined
              ? selectedReport.savedItbisRate
              : (activeSheet.itbisRate !== undefined ? activeSheet.itbisRate : params.percentItbis);

            const effIsItbisInclusive = isReportClosed && selectedReport?.savedIsItbisInclusive !== undefined
              ? selectedReport.savedIsItbisInclusive
              : params.isItbisInclusive;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Panel de Cotejo (Checkboxes) */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                      <span className="bg-blue-50 text-blue-600 p-1.5 rounded">
                        <Settings2 size={14} />
                      </span>
                      Cotejo de Retenciones y Parámetros
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Seleccione los descuentos o adiciones que aplican a la cuenta
                      de este ajustero.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs pt-1">
                    {/* ISR Toggle */}
                    <label className={`flex items-center justify-between py-2.5 px-1 rounded transition-all ${isReportClosed ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50/50"}`}>
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={effCheckedIsr}
                          disabled={isReportClosed}
                          onChange={(e) =>
                            onUpdateSheet({
                              ...activeSheet,
                              applyIsr: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="font-semibold text-slate-700">
                          Impuesto sobre la Renta (ISR)
                        </span>
                      </div>
                      <span className="font-mono text-[11px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded border border-red-100 animate-fade-in">
                        Tasa: {effPercentIsr}%
                      </span>
                    </label>

                    {/* TSS Toggle */}
                    <label className={`flex items-center justify-between py-2.5 px-1 rounded transition-all ${isReportClosed ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50/50"}`}>
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={effCheckedTss}
                          disabled={isReportClosed}
                          onChange={(e) =>
                            onUpdateSheet({
                              ...activeSheet,
                              applyTss: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="font-semibold text-slate-700">
                          Seguridad Social (TSS)
                        </span>
                      </div>
                      <span className="font-mono text-[11px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100 animate-fade-in">
                        Tasa: {effPercentTss}%
                      </span>
                    </label>

                    {/* Pensión Toggle */}
                    <label className={`flex items-center justify-between py-2.5 px-1 rounded transition-all ${isReportClosed ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50/50"}`}>
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={effCheckedPension}
                          disabled={isReportClosed}
                          onChange={(e) =>
                            onUpdateSheet({
                              ...activeSheet,
                              applyPension: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="font-semibold text-slate-700">
                          FOPETCONS (Ley 6-86)
                        </span>
                      </div>
                      <span className="font-mono text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100 animate-fade-in">
                        Tasa: {effPercentPension}%
                      </span>
                    </label>

                    {/* Garantía Toggle */}
                    <label className={`flex items-center justify-between py-2.5 px-1 rounded transition-all ${isReportClosed ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50/50"}`}>
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={effCheckedWarranty}
                          disabled={isReportClosed}
                          onChange={(e) =>
                            onUpdateSheet({
                              ...activeSheet,
                              applyWarranty: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="font-semibold text-slate-700">
                          Retención de Garantía (Amortización)
                        </span>
                      </div>
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200 animate-fade-in">
                        Tasa: {effPercentWarranty}%
                      </span>
                    </label>

                    {/* ITBIS Toggle with interactive rate selector */}
                    <div className={`py-2.5 px-1 rounded transition-all ${isReportClosed ? "opacity-60" : ""}`}>
                      <div className="flex items-center justify-between">
                        <label className={`flex items-center space-x-2.5 select-none ${isReportClosed ? "cursor-not-allowed" : "cursor-pointer"}`}>
                          <input
                            type="checkbox"
                            checked={effCheckedItbis}
                            disabled={isReportClosed}
                            onChange={(e) =>
                              onUpdateSheet({
                                ...activeSheet,
                                applyItbis: e.target.checked,
                                itbisRate:
                                  activeSheet.itbisRate !== undefined
                                    ? activeSheet.itbisRate
                                    : params.percentItbis,
                              })
                            }
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="font-semibold text-slate-700">
                            Adición de ITBIS al Neto
                          </span>
                        </label>
                        <span className="font-mono text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100">
                          Suma:{" "}
                          {effItbisRateForSheet === 1.8
                            ? "1.8% (Norma 07-2007)"
                            : `${effItbisRateForSheet}%`}
                        </span>
                      </div>

                      {/* Underneath toggle: Dynamic Rate choice (1.8% vs 18%) directly in sheet */}
                      {effCheckedItbis && (
                        <div className="ml-6.5 pl-2.5 border-l-2 border-emerald-200 mt-2 space-y-1.5 py-0.5 animate-fade-in">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wide">
                            Seleccionar Tasa de ITBIS en esta Hoja:
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isReportClosed}
                              onClick={() =>
                                onUpdateSheet({ ...activeSheet, itbisRate: 1.8 })
                              }
                              className={`px-2 py-1 text-[11.5px] font-extrabold rounded-md border transition-all flex-1 text-center ${
                                effItbisRateForSheet === 1.8
                                  ? "bg-emerald-100 border-emerald-400 text-emerald-800 shadow-xs"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              } ${isReportClosed ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            >
                              1.8% (Norma 07-2007)
                            </button>
                            <button
                              type="button"
                              disabled={isReportClosed}
                              onClick={() =>
                                onUpdateSheet({ ...activeSheet, itbisRate: 18 })
                              }
                              className={`px-2 py-1 text-[11.5px] font-extrabold rounded-md border transition-all flex-1 text-center ${
                                effItbisRateForSheet === 18
                                  ? "bg-emerald-100 border-emerald-400 text-emerald-800 shadow-xs"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              } ${isReportClosed ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            >
                              18% (Tasa Estándar)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Descuentos Directos Personalizables */}
                  {viewMode !== "historico" && selectedReport && (
                    <div className="pt-3 mt-3 border-t border-dashed border-slate-200 space-y-2.5">
                      <span className="text-[10px] font-bold text-slate-400 theme-mono uppercase tracking-wider block font-mono">
                        Descuentos Especiales / Amortización (Corte Actual)
                      </span>

                      {/* Advance Payment */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value="Anticipo / Avance"
                          disabled
                          className="w-1/2 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700 font-medium cursor-not-allowed"
                        />
                        <div className="w-1/2 relative">
                          <span className="absolute left-2 top-1.5 text-red-500 font-bold text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={selectedReport.advancePayment || ""}
                            placeholder="Monto de Anticipo"
                            onChange={(e) =>
                              handleDiscountChange("advancePayment", e.target.value)
                            }
                            disabled={selectedReport.status === "CERRADO"}
                            className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-right font-mono font-bold text-red-650 focus:ring-1 focus:ring-red-400 disabled:opacity-50 disabled:bg-slate-105 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Discount 1 */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={selectedReport.discount1Label || ""}
                          placeholder="ej. Descuento Herramientas"
                          onChange={(e) =>
                            handleDiscountLabelChange(
                              "discount1Label",
                              e.target.value,
                            )
                          }
                          disabled={selectedReport.status === "CERRADO"}
                          className="w-1/2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-medium disabled:opacity-50 disabled:bg-slate-105 disabled:cursor-not-allowed"
                        />
                        <div className="w-1/2 relative">
                          <span className="absolute left-2 top-1.5 text-red-500 font-bold text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={selectedReport.discount1 || ""}
                            placeholder="Monto"
                            onChange={(e) =>
                              handleDiscountChange("discount1", e.target.value)
                            }
                            disabled={selectedReport.status === "CERRADO"}
                            className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-right font-mono font-bold text-red-650 focus:ring-1 focus:ring-red-400 disabled:opacity-50 disabled:bg-slate-105 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Discount 2 */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={selectedReport.discount2Label || ""}
                          placeholder="ej. Anticipo Especial"
                          onChange={(e) =>
                            handleDiscountLabelChange(
                              "discount2Label",
                              e.target.value,
                            )
                          }
                          disabled={selectedReport.status === "CERRADO"}
                          className="w-1/2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-medium disabled:opacity-50 disabled:bg-slate-105 disabled:cursor-not-allowed"
                        />
                        <div className="w-1/2 relative">
                          <span className="absolute left-2 top-1.5 text-red-500 font-bold text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={selectedReport.discount2 || ""}
                            placeholder="Monto"
                            onChange={(e) =>
                              handleDiscountChange("discount2", e.target.value)
                            }
                            disabled={selectedReport.status === "CERRADO"}
                            className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-right font-mono font-bold text-red-650 focus:ring-1 focus:ring-red-400 disabled:opacity-50 disabled:bg-slate-105 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                      
                      {/* Warranty Deduction (only for warranty release reports) */}
                      {selectedReport.isWarrantyRelease && (
                        <div className="flex items-center gap-2 pt-2 border-t border-amber-100">
                          <input
                            type="text"
                            value={selectedReport.warrantyDeductionLabel || "Descuento por Reparaciones"}
                            placeholder="ej. Cargos por Abandono"
                            onChange={(e) =>
                              handleDiscountLabelChange(
                                "warrantyDeductionLabel",
                                e.target.value,
                              )
                            }
                            disabled={selectedReport.status === "CERRADO"}
                            className="w-1/2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 font-bold disabled:opacity-50 disabled:bg-amber-100 disabled:cursor-not-allowed"
                          />
                          <div className="w-1/2 relative">
                            <span className="absolute left-2 top-1.5 text-red-500 font-bold text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={selectedReport.warrantyDeduction || ""}
                              placeholder="Monto a Descontar"
                              onChange={(e) =>
                                handleDiscountChange("warrantyDeduction", e.target.value)
                              }
                              disabled={selectedReport.status === "CERRADO"}
                              className="w-full pl-5 pr-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-right font-mono font-bold text-red-650 focus:ring-1 focus:ring-red-400 disabled:opacity-50 disabled:bg-amber-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Panel de Liquidación (Breakdown de Subtotales) */}
                <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-6 shadow-md text-white flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {viewMode === "historico"
                    ? "RESUMEN DE LIQUIDACIÓN HISTÓRICO"
                    : "LIQUIDACIÓN CORTE DE PAGO SELECCIONADO"}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                  {viewMode === "historico"
                    ? "DATOS GLOBALES DEL AJUSTE"
                    : `VALORACIÓN REPORTE: ${selectedReport?.name || "VISTA ACTUAL"}`}
                </p>

                <div className="space-y-3 mt-6 border-b border-slate-800 pb-4">
                  {/* Gross Subtotal */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-305">
                    <span>(-) SUB-TOTAL VALOR BRUTO:</span>
                    <span className="font-mono text-[13px]">
                      {viewMode === "historico"
                        ? formatCurrencyValue(
                            sheetTotals.gross,
                            params.currency,
                          )
                        : formatCurrencyValue(
                            taxDetails.subtotal,
                            params.currency,
                          )}
                    </span>
                  </div>

                  {/* Apply ISR breakdown */}
                  {activeSheet.applyIsr !== false && (
                    <div className="flex items-center justify-between text-xs font-medium text-red-400">
                      <span>RETENCIÓN ISR ({effPercentIsr}%):</span>
                      <span className="font-mono">
                        -
                        {viewMode === "historico"
                          ? formatCurrencyValue(
                              sheetTotals.isr,
                              params.currency,
                            )
                          : formatCurrencyValue(
                              taxDetails.isr,
                              params.currency,
                            )}
                      </span>
                    </div>
                  )}

                  {/* Apply TSS breakdown */}
                  {activeSheet.applyTss !== false && (
                    <div className="flex items-center justify-between text-xs font-medium text-blue-300">
                      <span>RETENCIÓN TSS ({effPercentTss}%):</span>
                      <span className="font-mono">
                        -
                        {viewMode === "historico"
                          ? formatCurrencyValue(
                              sheetTotals.tss,
                              params.currency,
                            )
                          : formatCurrencyValue(
                              taxDetails.tss,
                              params.currency,
                            )}
                      </span>
                    </div>
                  )}

                  {/* Apply Pensión breakdown */}
                  {activeSheet.applyPension !== false && (
                    <div className="flex items-center justify-between text-xs font-medium text-indigo-300">
                      <span>
                        RETENCIÓN FONDO DE PENSIONES LEY 6-86 ({effPercentPension}%):
                      </span>
                      <span className="font-mono">
                        -
                        {viewMode === "historico"
                          ? formatCurrencyValue(
                              sheetTotals.pension,
                              params.currency,
                            )
                          : formatCurrencyValue(
                              taxDetails.pension,
                              params.currency,
                            )}
                      </span>
                    </div>
                  )}

                  {/* Apply Garantía breakdown */}
                  {activeSheet.applyWarranty !== false && (
                    <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                      <span>
                        RETENCIÓN GARANTÍA ({effPercentWarranty}%):
                      </span>
                      <span className="font-mono">
                        -
                        {viewMode === "historico"
                          ? formatCurrencyValue(
                              sheetTotals.warranty,
                              params.currency,
                            )
                          : formatCurrencyValue(
                              taxDetails.warranty,
                              params.currency,
                            )}
                      </span>
                    </div>
                  )}

                  {/* Advance Payment */}
                  {viewMode !== "historico" && taxDetails.advancePayment > 0 && (
                    <div className="flex items-center justify-between text-xs font-medium text-amber-500">
                      <span>
                        ANTICIPO / AVANCE:
                      </span>
                      <span className="font-mono text-red-500">
                        -
                        {formatCurrencyValue(
                          taxDetails.advancePayment,
                          params.currency,
                        )}
                      </span>
                    </div>
                  )}

                  {/* Manual Discount 1 */}
                  {viewMode !== "historico" && taxDetails.discount1 > 0 && (
                    <div className="flex items-center justify-between text-xs font-medium text-amber-400">
                      <span>
                        {selectedReport?.discount1Label ||
                          "DESCUENTO ESPECIAL 1"}
                        :
                      </span>
                      <span className="font-mono text-red-400">
                        -
                        {formatCurrencyValue(
                          taxDetails.discount1,
                          params.currency,
                        )}
                      </span>
                    </div>
                  )}

                  {/* Manual Discount 2 */}
                  {viewMode !== "historico" && taxDetails.discount2 > 0 && (
                    <div className="flex items-center justify-between text-xs font-medium text-amber-450">
                      <span>
                        {selectedReport?.discount2Label ||
                          "DESCUENTO ESPECIAL 2"}
                        :
                      </span>
                      <span className="font-mono text-red-400">
                        -
                        {formatCurrencyValue(
                          taxDetails.discount2,
                          params.currency,
                        )}
                      </span>
                    </div>
                  )}

                  {/* Warranty Deduction */}
                  {viewMode !== "historico" && taxDetails.warrantyDeduction > 0 && (
                    <div className="flex items-center justify-between text-xs font-medium text-rose-400">
                      <span>
                        {selectedReport?.warrantyDeductionLabel ||
                          "DESCUENTO POR REPARACIONES"}
                        :
                      </span>
                      <span className="font-mono text-red-400">
                        -
                        {formatCurrencyValue(
                          taxDetails.warrantyDeduction,
                          params.currency,
                        )}
                      </span>
                    </div>
                  )}

                  {/* Apply ITBIS breakdown */}
                  {activeSheet.applyItbis === true && (
                    <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
                      <span>
                        {effIsItbisInclusive
                          ? "ITBIS DETECTADO"
                          : "ADICIÓN ITBIS"}{" "}
                        (
                        {effItbisRateForSheet === 1.8
                          ? "1.8% (Norma 07-2007)"
                          : `${effItbisRateForSheet}%`}
                        ):
                      </span>
                      <span className="font-mono">
                        {effIsItbisInclusive ? "✓ " : "+"}
                        {viewMode === "historico"
                          ? formatCurrencyValue(
                              sheetTotals.itbis,
                              params.currency,
                            )
                          : formatCurrencyValue(
                              taxDetails.itbis,
                              params.currency,
                            )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grand Total Net Payable and Print Actions */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-4">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                    NETO TOTAL INTEGRAL A PAGAR:
                  </span>
                  <p className="text-xl font-black text-emerald-400 font-mono tracking-tight shrink-0">
                    {viewMode === "historico"
                      ? formatCurrencyValue(sheetTotals.net, params.currency)
                      : formatCurrencyValue(
                          taxDetails.netPayable,
                          params.currency,
                        )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <Printer size={14} className="text-blue-100" />
                  <span>Vista Previa de Impresión</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
        </div>
      )}

      {/* Autocomplete Datalist */}
      <datalist id="subchapters-list">
        {existingSubchapters.map((subItem) => (
          <option key={subItem} value={subItem} />
        ))}
      </datalist>

      {/* Interactive Print Preview Modal */}
      {showPrintPreview && activeSheet && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center py-6 px-4">
          <style dangerouslySetInnerHTML={{ __html: printStyleHTML }} />

          <div className="relative bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col my-auto pointer-events-auto print:my-0 print:border-none print:shadow-none">
            {/* Header Control Panel (no-print) */}
            <div className="no-print bg-[#0F172A] text-white border-b border-slate-800 rounded-t-xl">
              <div className="px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold flex items-center gap-2 font-sans text-white">
                    <Printer size={16} className="text-blue-400" />
                    <span>Vista Previa de Comprobante de Pago</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider font-mono">
                    {viewMode === "historico"
                      ? "Historial Consolidado"
                      : `CORTE: ${selectedReport?.name || "ACTUAL"}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrint()}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border border-blue-700 shadow-xs"
                  >
                    <Printer size={13} />
                    <span>Imprimir Comprobante</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-1 px-3.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {/* Cotejo / Config Sub-panel */}
              <div className="px-6 py-3 bg-[#0b0f19] border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-slate-300 font-bold shrink-0">Tipo de Comprobante:</span>
                  <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherPrintMode("contractor");
                        setIsInternalCopy(false);
                      }}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        voucherPrintMode === "contractor"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Copia Contratista
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherPrintMode("company");
                        setIsInternalCopy(true);
                      }}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        voucherPrintMode === "company"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Copia Empresa (Interna)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherPrintMode("both");
                        setIsInternalCopy(true);
                      }}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        voucherPrintMode === "both"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Ambos Comprobantes (Dos Páginas)
                    </button>
                  </div>
                  <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
                       <input 
                         type="checkbox" 
                         checked={printWithMeasurements} 
                         onChange={(e) => setPrintWithMeasurements(e.target.checked)} 
                         className="w-3.5 h-3.5 accent-blue-500 rounded bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                       />
                       <span className="font-bold">Incluir Soportes de Medición</span>
                    </label>
                  </div>
                </div>
                <div className="text-slate-400 text-[11px] bg-slate-900/50 py-1 px-2.5 rounded border border-slate-800 lg:text-right shrink-0">
                  {voucherPrintMode === "contractor" && "✓ Oculta datos institucionales y firmas de supervisión."}
                  {voucherPrintMode === "company" && "✓ Incluye datos institucional, supervisor de obra y firmas cruzadas."}
                  {voucherPrintMode === "both" && "✓ Genera un único PDF con ambos comprobantes en páginas separadas."}
                </div>
              </div>

              {/* Optional secondary subbar for measurement support settings (no-print) */}
              {printWithMeasurements && (
                <div className="no-print px-6 py-2 bg-[#121929] border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-sans text-slate-300">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[10px] font-mono uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-semibold text-slate-400">
                      Cómputos auxiliares: Max columnas = {gridInfo.maxCols} (~{gridInfo.maxWidth}px)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">Orientación automática:</span>
                      <strong className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${printOrientation === "landscape" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-blue-950 text-blue-300 border border-blue-800"}`}>
                        {printOrientation === "landscape" ? "Horizontal (Landscape)" : "Vertical (Portrait)"}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">Tamaño de Hoja sugerido:</span>
                      <select
                        value={paperSize}
                        onChange={(e) => setPaperSize(e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                      >
                        <option value="letter">Carta (Letter) - {printOrientation === "landscape" ? "920px" : "580px"}</option>
                        <option value="legal">Legal (Oficio / Oficio) - 1200px</option>
                        <option value="a4">A4 - 1050px</option>
                        <option value="a3">A3 (Gran Formato) - 1750px</option>
                      </select>
                    </span>
                  </div>
                  {exceedsSelectedPaper && (
                    <div className="bg-amber-950 border border-amber-800/60 text-[11px] text-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-md shadow-lg">
                      <span className="font-bold">⚠️ ADVERTENCIA: Las mediciones ({gridInfo.maxWidth}px) exceden el papel {paperSize === "letter" ? "Carta" : paperSize === "legal" ? "Legal" : paperSize === "a4" ? "A4" : "A3"}. Cambie a un tamaño mayor (como {suggestedSize.toUpperCase()}) o configure 'Ajustar a la página' en su navegador para evitar recortes.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable container on screen; full size on print */}
            <div
              id="printable-invoice-modal"
              ref={printableRef}
              className="p-8 md:p-12 bg-white overflow-y-auto max-h-[80vh] print:max-h-none print:overflow-visible print:p-[0.35in]"
            >
              {(() => {
                const renderVoucher = (isInternal: boolean, forceHideMeasurements?: boolean) => {
                  return (
                    <>
                      <div className="space-y-6 bg-white shrink-0 print:p-0 break-inside-avoid shadow-none border-none">
                      {/* Header section based on mode */}
                      {isInternal ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-5 print-row">
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
                                {params.companyName ||
                                  "Constructora Alba & Sánchez S.R.L."}
                              </h1>
                              <p className="text-[11px] text-slate-500 font-bold uppercase font-mono leading-tight">
                                RNC: {params.companyRfc || "1-31-04281-2"}
                              </p>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs space-y-1 w-full sm:w-auto text-slate-700 font-sans min-w-[240px]">
                            <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider font-mono mb-2 border-b border-slate-200 pb-1">
                              Comprobante de Liquidación (Interno)
                            </div>
                            <div>
                              <strong>Nro. Documento:</strong>{" "}
                              <span className="font-mono text-slate-900 font-bold">
                                CUB-{activeSheet.code.toUpperCase()}-
                                {viewMode === "historico"
                                  ? "CONSOLIDADO"
                                  : selectedReport?.id.toUpperCase() || "REP-1"}
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
                            <div>
                              <strong>Moneda:</strong>{" "}
                              <span className="font-mono text-slate-900 font-bold">
                                {params.currency || "DOP"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-5 print-row">
                          <div className="flex items-center gap-4">
                            <div className="space-y-1">
                              <h1 className="text-xl font-black text-slate-950 tracking-tight uppercase font-sans">
                                COMPROBANTE DE LIQUIDACIÓN Y PAGO
                              </h1>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                                DOCUMENTO DE CONTROL DE TRABAJOS EJECUTADOS
                              </p>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs space-y-1 w-full sm:w-auto text-slate-700 font-sans min-w-[245px]">
                            <div className="text-[10px] font-bold uppercase text-slate-600 tracking-wider font-mono mb-2 border-b border-slate-250 pb-1">
                              Información del Registro
                            </div>
                            <div>
                              <strong>Nro. Documento:</strong>{" "}
                              <span className="font-mono text-slate-900 font-bold">
                                CUB-{activeSheet.code.toUpperCase()}-
                                {viewMode === "historico"
                                  ? "CONSOLIDADO"
                                  : selectedReport?.id.toUpperCase() || "REP-1"}
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
                            <div>
                              <strong>Moneda:</strong>{" "}
                              <span className="font-mono text-slate-900 font-bold">
                                {params.currency || "DOP"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contractor & Project Info block */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-slate-700 border-b border-slate-200 pb-5 print-grid-2">
                        <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-250">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            Datos del Beneficiario / Contratista
                          </div>
                          <div>
                            <strong>Nombre del Ajustero:</strong>{" "}
                            <span className="text-slate-900 font-black">
                              {voucherContractorName}
                            </span>
                          </div>
                          <div>
                            <strong>RNC / Cédula Identidad:</strong>{" "}
                            <span className="font-mono text-slate-900 font-black">
                              {voucherContractorDoc}
                            </span>
                          </div>
                          <div>
                            <strong>Teléfono:</strong>{" "}
                            <span className="font-mono text-slate-800 font-medium font-sans">
                              {voucherContractorPhone || "S/D"}
                            </span>
                          </div>
                          <div>
                            <strong>Especialidad/Tipo:</strong>{" "}
                            <span className="text-slate-800 font-bold">
                              {voucherContractorType}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-250">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            Detalles de la Obra y Período
                          </div>
                          <div>
                            <strong>Proyecto/Obra:</strong>{" "}
                            <span className="text-slate-900 font-extrabold">
                              {params.projectName || "Proyecto General"}
                            </span>
                          </div>
                          {isInternal && (
                            <div>
                              <strong>Supervisor Responsable:</strong>{" "}
                              <span className="text-slate-800 font-black">
                                {activeSheet.supervisor}
                              </span>
                            </div>
                          )}
                          <div>
                            <strong>Período de Liquidación:</strong>{" "}
                            <span className="bg-amber-100 text-amber-900 font-black px-1.5 py-0.5 rounded font-mono text-[10.5px]">
                              {viewMode === "historico"
                                ? `HISTÓRICO COMPLETO`
                                : `${selectedReport?.name || "Periodo Seleccionado"} (${formatDateReadable(selectedReport?.dateFrom)} al ${formatDateReadable(selectedReport?.dateTo)})`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-900 uppercase tracking-widest font-mono print:hidden">
                          Partidas Ejecutadas y Valoradas
                        </div>
                        <table className="w-full text-xs text-left border-collapse border border-slate-200 font-sans">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-200 font-mono">
                              <th className="px-2 py-1 border-r border-slate-200 text-center w-8">
                                No.
                              </th>
                              <th className="px-2 py-1 border-r border-slate-200 text-left w-32">
                                Subcapítulo
                              </th>
                              <th className="px-3 py-1 border-r border-slate-200 text-left">
                                Descripción del Trabajo
                              </th>
                              <th className="px-2 py-1 border-r border-slate-200 text-center w-12">
                                Unidad
                              </th>
                              <th className="px-2 py-1 border-r border-slate-200 text-right w-24">
                                Precio ({params.currency})
                              </th>
                              <th className="px-2 py-1 border-r border-slate-200 text-center w-18">
                                Cant.
                              </th>
                              <th className="px-2 py-1 text-right w-28">
                                Total Bruto ({params.currency})
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {printableVoucherRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center py-8 text-slate-400 italic"
                                >
                                  No se registraron partidas con cantidades aprobadas
                                  mayores a cero en este período o reporte.
                                </td>
                              </tr>
                            ) : (
                              printableVoucherRows.map((r, idx) => {
                                const currentSub = r.subchapter || "Obra Civil";
                                const prevSub =
                                  idx > 0
                                    ? printableVoucherRows[idx - 1].subchapter ||
                                      "Obra Civil"
                                    : null;
                                const isRepetitive = idx > 0 && currentSub === prevSub;

                                return (
                                  <tr
                                    key={r.id || idx}
                                    className="hover:bg-slate-50/50"
                                  >
                                    <td className="px-2 py-1 border-r border-slate-200 text-center font-mono font-black text-slate-800">
                                      {idx + 1}
                                    </td>
                                    <td
                                      className="px-2 py-1 border-r border-slate-200 font-bold text-slate-700 break-words whitespace-normal"
                                      title={currentSub}
                                    >
                                      {isRepetitive ? (
                                        <span className="text-slate-400 font-black text-sm block text-center select-none leading-none">
                                          "
                                        </span>
                                      ) : (
                                        currentSub
                                      )}
                                    </td>
                                    <td className="px-3 py-1 border-r border-slate-200 text-slate-800 font-medium">
                                      {r.description}
                                    </td>
                                    <td
                                      className="px-2 py-1 border-r border-slate-200 text-center font-mono font-bold text-slate-600 truncate max-w-[48px]"
                                      title={r.unit}
                                    >
                                      {r.unit}
                                    </td>
                                    <td className="px-2 py-1 border-r border-slate-200 text-right font-mono text-slate-700">
                                      {formatCurrencyValue(
                                        r.priceUnit,
                                        params.currency,
                                      )}
                                    </td>
                                    <td className="px-2 py-1 border-r border-slate-200 text-center font-mono font-black text-slate-900">
                                      {r.qty}
                                    </td>
                                    <td className="px-2 py-1 text-right font-mono font-black text-slate-900">
                                      {formatCurrencyValue(
                                        r.grossValue,
                                        params.currency,
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Financial Summary & Signatures */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 print-grid-2">
                        {/* Signatures & Auditor Note section */}
                        <div className="space-y-4 flex flex-col justify-between">
                          <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-lg text-[11px] text-slate-600 font-sans leading-relaxed">
                            <span className="font-bold block text-slate-800 mb-1 uppercase text-[10px] font-mono tracking-wide">
                              Términos y Declaración
                            </span>
                            El presente reporte físico de obra y Liquidación de Ajustes
                            se emite para los fines correspondientes de pago. Los
                            valores de retención (FOPETCONS Ley 6-86, TSS, ISR,
                            Amortizaciones de Garantía o Descuentos) se han aplicado en
                            estricto cumplimiento con las condiciones contractuales del
                            proyecto y las ordenanzas de la DGII / Norma 07-2007 vigentes.
                          </div>

                          {/* Real Signatures Boxes */}
                          <div className="space-y-8 pt-4">
                            {isInternal ? (
                              <>
                                <div className="grid grid-cols-2 gap-6 pt-12">
                                  {/* Supervisor Block */}
                                  <div className="relative flex flex-col items-center justify-end text-center font-sans h-[120px]">
                                    {selectedReport?.supervisorSignature && (
                                      <div className="absolute bottom-16 flex justify-center h-14 w-full z-10 pointer-events-none pb-1">
                                        <img
                                          src={selectedReport.supervisorSignature}
                                          alt="Firma Supervisor"
                                          className="h-14 object-contain block mix-blend-multiply"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    )}
                                    <div className="w-full border-t border-slate-400 pt-1 h-16 flex flex-col justify-start">
                                      <span className="block font-black text-slate-900 text-[10px] min-h-[16px] truncate">
                                        {activeSheet.supervisor}
                                      </span>
                                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                        PREPARADO Y AUTORIZADO POR (SUPERVISOR /
                                        INGENIERO DE OBRA)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Contractor Block */}
                                  <div className="relative flex flex-col items-center justify-end text-center font-sans h-[120px]">
                                    <div className="w-full border-t border-slate-400 pt-1 h-16 flex flex-col justify-start">
                                      <span className="block font-black text-slate-900 text-[10px] min-h-[16px] truncate">
                                        {voucherContractorName}
                                      </span>
                                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                        Cédula: {voucherContractorDoc}
                                      </span>
                                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                        APROBADO POR (CONTRATISTA)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="w-1/2 mx-auto space-y-1 border-t border-slate-400 pt-1 text-center font-sans">
                                  <span className="block font-black text-slate-700 text-[10px] min-h-[16px]">
                                    CONTROL INTERNO
                                  </span>
                                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                    AUDITORÍA Y FISCALIZACIÓN
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-center pt-2">
                                <div className="w-2/3 space-y-1.5 border-t border-slate-400 pt-2 text-center font-sans">
                                  <div className="h-10"></div>
                                  <span className="block font-black text-slate-950 text-xs tracking-wide uppercase">
                                    {voucherContractorName}
                                  </span>
                                  <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase">
                                    CÉDULA / RNC: {voucherContractorDoc}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    FIRMA DEL CONTRATISTA
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Billing Summary Box */}
                        <div className="bg-white text-slate-950 border border-slate-300 rounded-xl p-5 font-sans text-xs space-y-2.5 h-fit shadow-xs print-financial-box">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-900 font-mono border-b border-slate-200 pb-2">
                            Resumen Financiero del Pago
                          </div>

                          <div className="flex justify-between items-center text-slate-900 font-medium font-bold">
                            <span>Subtotal Valor Bruto Reporte:</span>
                            <span className="font-mono text-slate-950 font-black">
                              {formatCurrencyValue(voucherSubtotalVal, params.currency)}
                            </span>
                          </div>

                          {activeSheet.applyIsr !== false && voucherIsrVal > 0 && (
                            <div className="flex justify-between items-center text-slate-800">
                              <span>
                                Deducción Retención ISR ({params.percentIsr}%):
                              </span>
                              <span className="font-mono font-bold">
                                -{formatCurrencyValue(voucherIsrVal, params.currency)}
                              </span>
                            </div>
                          )}

                          {activeSheet.applyTss !== false && voucherTssVal > 0 && (
                            <div className="flex justify-between items-center text-slate-800">
                              <span>
                                Deducción Retención TSS ({params.percentTss}%):
                              </span>
                              <span className="font-mono font-bold">
                                -{formatCurrencyValue(voucherTssVal, params.currency)}
                              </span>
                            </div>
                          )}

                          {activeSheet.applyPension !== false &&
                            voucherPensionVal > 0 && (
                              <div className="flex justify-between items-center text-slate-800">
                                <span>
                                  Deducción FOPETCONS ({params.percentPension}% (Ley 6-86)):
                                </span>
                                <span className="font-mono font-bold">
                                  -
                                  {formatCurrencyValue(
                                    voucherPensionVal,
                                    params.currency,
                                  )}
                                </span>
                              </div>
                            )}

                          {activeSheet.applyWarranty !== false &&
                            voucherWarrantyVal > 0 && (
                              <div className="flex justify-between items-center text-slate-800">
                                <span>
                                  Deducción Retención Garantía ({params.percentWarranty}
                                  %):
                                </span>
                                <span className="font-mono font-bold">
                                  -
                                  {formatCurrencyValue(
                                    voucherWarrantyVal,
                                    params.currency,
                                  )}
                                </span>
                              </div>
                            )}

                          {viewMode !== "historico" && voucherAdvancePayment > 0 && (
                            <div className="flex justify-between items-center text-slate-800">
                              <span>Anticipo / Avance:</span>
                              <span className="font-mono font-bold">
                                -
                                {formatCurrencyValue(voucherAdvancePayment, params.currency)}
                              </span>
                            </div>
                          )}

                          {viewMode !== "historico" && voucherDiscount1 > 0 && (
                            <div className="flex justify-between items-center text-slate-800">
                              <span>
                                {selectedReport?.discount1Label || "Descuento 1"}:
                              </span>
                              <span className="font-mono font-bold">
                                -
                                {formatCurrencyValue(voucherDiscount1, params.currency)}
                              </span>
                            </div>
                          )}

                          {viewMode !== "historico" && voucherDiscount2 > 0 && (
                            <div className="flex justify-between items-center text-slate-800">
                              <span>
                                {selectedReport?.discount2Label || "Descuento 2"}:
                              </span>
                              <span className="font-mono font-bold">
                                -
                                {formatCurrencyValue(voucherDiscount2, params.currency)}
                              </span>
                            </div>
                          )}

                          {viewMode !== "historico" && voucherWarrantyDeduction > 0 && (
                            <div className="flex justify-between items-center text-slate-800">
                              <span>
                                {selectedReport?.warrantyDeductionLabel || "Descuento Reparaciones"}:
                              </span>
                              <span className="font-mono font-bold">
                                -
                                {formatCurrencyValue(voucherWarrantyDeduction, params.currency)}
                              </span>
                            </div>
                          )}

                          {activeSheet.applyItbis === true && voucherItbisVal > 0 && (
                            <div className="flex justify-between items-center text-slate-900 font-semibold">
                              <span>
                                Adición de ITBIS (
                                {(activeSheet.itbisRate !== undefined
                                  ? activeSheet.itbisRate
                                  : params.percentItbis) === 1.8
                                  ? "1.8% (Norma 07-2007)"
                                  : `${
                                      activeSheet.itbisRate !== undefined
                                        ? activeSheet.itbisRate
                                        : params.percentItbis
                                    }%`}
                                ):
                              </span>
                              <span className="font-mono font-bold">
                                +{formatCurrencyValue(voucherItbisVal, params.currency)}
                              </span>
                            </div>
                          )}

                          <div className="border-t border-slate-250 pt-3 mt-1 flex justify-between items-center font-sans">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-900 uppercase font-black tracking-wider block font-mono">
                                NETO A PAGAR:
                              </span>
                              <span className="text-black text-xl font-black font-mono tracking-tight block">
                                {formatCurrencyValue(voucherNetVal, params.currency)}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-950 bg-slate-100 border border-slate-350 px-2 py-0.5 rounded font-black uppercase">
                              Corte Listo
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Support page that prints as a stand-alone separate page */}
                    {!forceHideMeasurements && printWithMeasurements && selectedReport && printableVoucherRows.some(r => selectedReport.formulas?.[r.id] || selectedReport.grids?.[r.id]) && (
                      <>
                        {/* Visual dashed line indicating page break in print preview (screen-only) */}
                        <div className="no-print my-12 border-t-2 border-dashed border-slate-325 relative flex justify-center items-center">
                          <span className="absolute -top-3.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] uppercase font-black tracking-widest px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 font-sans">
                            ✂️ Salto de Página: Soporte de Mediciones y Cómputos
                          </span>
                        </div>
                        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} className="print:break-before-page pt-8 print:pt-0 mt-8 space-y-6">
                        {/* Elegant standalone print header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
                          <div className="flex items-center gap-4">
                            {params.companyLogo && (
                              <img 
                                src={params.companyLogo} 
                                alt="Logo Empresa" 
                                className="h-10 w-auto object-contain max-w-[140px]"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="space-y-0.5">
                              <h1 className="text-sm font-black text-slate-900 uppercase font-sans tracking-tight">
                                {params.companyName || "Constructora Alba & Sánchez S.R.L."}
                              </h1>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                                SOPORTE DE MEDICIÓN Y CÓMPUTOS MÉTRICOS
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-[10px] text-slate-500 font-mono">
                            <div><strong>DOCUMENTO:</strong> CUB-{activeSheet.code.toUpperCase()}-{selectedReport?.id.toUpperCase() || "REP-1"}</div>
                            <div><strong>FECHA:</strong> {new Date().toLocaleDateString("es-DO")}</div>
                          </div>
                        </div>

                        {/* Metadata table of Contractor / Supervisor */}
                        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[10px] grid grid-cols-2 gap-4 font-sans text-slate-700">
                          <div>
                            <strong>CONTRATISTA / BENEFICIARIO:</strong> {voucherContractorName} ({voucherContractorDoc})
                          </div>
                          <div className="text-right">
                            <strong>SUPERVISOR DE OBRA:</strong> {activeSheet.supervisor || "Ingeniero Supervisor"}
                          </div>
                        </div>

                        {/* List of active item measurements */}
                        <div className="space-y-6">
                          {printableVoucherRows.map((rInfo) => {
                            const formula = selectedReport.formulas?.[rInfo.id];
                            const gridJson = selectedReport.grids?.[rInfo.id];
                            if (!formula && !gridJson) return null;
                            
                            const cInfo = contractors.find((c) => c.id === rInfo.contractorId);
                            
                            return (
                              <div key={`separate-page-support-${rInfo.id}`} className="border border-slate-350 rounded overflow-hidden text-slate-800 bg-white print:break-inside-avoid shadow-xs">
                                <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-300 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-black text-slate-900">
                                        [{rInfo.no}] {rInfo.description}
                                     </span>
                                     <span className="text-[9px] font-mono bg-slate-200 text-slate-705 px-2 py-0.5 rounded font-bold">
                                        Unidad: {rInfo.unit || "N/A"}
                                     </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     {cInfo && (
                                       <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest hidden sm:block">
                                          AJUSTADOR: {cInfo.name}
                                       </span>
                                     )}
                                     <span className="text-[10px] font-extrabold text-slate-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-mono">
                                        Cantidad Medida: {formatQuantityDisplay(selectedReport.quantities[rInfo.id])}
                                     </span>
                                  </div>
                                </div>
                                
                                <div className="p-3 space-y-3">
                                  {formula && (
                                     <div className="text-[10px] font-mono flex items-center gap-2 font-bold">
                                        <span className="text-slate-505">Fórmula de Apoyo:</span>
                                        <span className="text-amber-800 bg-amber-55 px-2 py-0.5 rounded border border-amber-200">
                                          {formula}
                                        </span>
                                     </div>
                                  )}
                                  
                                  {gridJson && (
                                     <div className="border border-slate-200 rounded overflow-hidden bg-white max-w-full overflow-x-auto print:overflow-hidden print:w-full">
                                        <MeasurementGrid 
                                          initialData={gridJson}
                                          isReadOnly={true}
                                          onChange={() => {}}
                                          uiColor="emerald"
                                          key={`print-grid-separate-${rInfo.id}`}
                                        />
                                     </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                  </>
                );
              };

                return voucherPrintMode === "both" ? (
                  <div className="space-y-12 print:space-y-0">
                    <div className="pb-8 print:pb-0 print:break-after-avoid">
                      {renderVoucher(true, true)}
                      {/* Visual dashed line indicating page break in print preview (screen-only) */}
                      <div className="no-print my-12 border-t-2 border-dashed border-slate-325 relative flex justify-center items-center">
                        <span className="absolute -top-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] uppercase font-black tracking-widest px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 font-sans">
                          ✂️ Salto de Página: Copia para el Contratista
                        </span>
                      </div>
                    </div>
                    <div className="break-before-page print:break-before-page pt-8 print:pt-0" style={{ pageBreakBefore: "always", breakBefore: "page" }}>
                      {renderVoucher(false, true)}
                    </div>

                    {/* Standalone support page when printing both - only rendered once */}
                    {printWithMeasurements && selectedReport && printableVoucherRows.some(r => selectedReport.formulas?.[r.id] || selectedReport.grids?.[r.id]) && (
                      <>
                        {/* Visual dashed line indicating page break in print preview (screen-only) */}
                        <div className="no-print my-12 border-t-2 border-dashed border-slate-325 relative flex justify-center items-center">
                          <span className="absolute -top-3.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] uppercase font-black tracking-widest px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 font-sans">
                            ✂️ Salto de Página: Soporte de Mediciones y Cómputos
                          </span>
                        </div>
                        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} className="print:break-before-page pt-8 print:pt-0 mt-8 space-y-6">
                          {/* Elegant standalone print header */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
                            <div className="flex items-center gap-4">
                              {params.companyLogo && (
                                <img 
                                  src={params.companyLogo} 
                                  alt="Logo Empresa" 
                                  className="h-10 w-auto object-contain max-w-[140px]"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="space-y-0.5">
                                <h1 className="text-sm font-black text-slate-900 uppercase font-sans tracking-tight">
                                  {params.companyName || "Constructora Alba & Sánchez S.R.L."}
                                </h1>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                                  SOPORTE DE MEDICIÓN Y CÓMPUTOS MÉTRICOS
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-slate-500 font-mono">
                              <div><strong>DOCUMENTO:</strong> CUB-{activeSheet.code.toUpperCase()}-{selectedReport?.id.toUpperCase() || "REP-1"}</div>
                              <div><strong>FECHA:</strong> {new Date().toLocaleDateString("es-DO")}</div>
                            </div>
                          </div>

                          {/* Metadata table of Contractor / Supervisor */}
                          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[10px] grid grid-cols-2 gap-4 font-sans text-slate-700">
                            <div>
                              <strong>CONTRATISTA / BENEFICIARIO:</strong> {voucherContractorName} ({voucherContractorDoc})
                            </div>
                            <div className="text-right">
                              <strong>SUPERVISOR DE OBRA:</strong> {activeSheet.supervisor || "Ingeniero Supervisor"}
                            </div>
                          </div>

                          {/* List of active item measurements */}
                          <div className="space-y-6">
                            {printableVoucherRows.map((rInfo) => {
                              const formula = selectedReport.formulas?.[rInfo.id];
                              const gridJson = selectedReport.grids?.[rInfo.id];
                              if (!formula && !gridJson) return null;
                              
                              const cInfo = contractors.find((c) => c.id === rInfo.contractorId);
                              
                              return (
                                <div key={`separate-page-support-shared-${rInfo.id}`} className="border border-slate-350 rounded overflow-hidden text-slate-800 bg-white print:break-inside-avoid shadow-xs">
                                  <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-300 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-black text-slate-900">
                                          [{rInfo.no}] {rInfo.description}
                                       </span>
                                       <span className="text-[9px] font-mono bg-slate-200 text-slate-705 px-2 py-0.5 rounded font-bold">
                                          Unidad: {rInfo.unit || "N/A"}
                                       </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       {cInfo && (
                                         <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest hidden sm:block">
                                            AJUSTADOR: {cInfo.name}
                                         </span>
                                       )}
                                       <span className="text-[10px] font-extrabold text-slate-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-mono">
                                          Cantidad Medida: {formatQuantityDisplay(selectedReport.quantities[rInfo.id])}
                                       </span>
                                    </div>
                                  </div>
                                  
                                  <div className="p-3 space-y-3">
                                    {formula && (
                                       <div className="text-[10px] font-mono flex items-center gap-2 font-bold">
                                          <span className="text-slate-550">Fórmula de Apoyo:</span>
                                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                            {formula}
                                          </span>
                                       </div>
                                    )}
                                    
                                    {gridJson && (
                                       <div className="border border-slate-200 rounded overflow-hidden bg-white max-w-full overflow-x-auto print:overflow-hidden print:w-full">
                                          <MeasurementGrid 
                                            initialData={gridJson}
                                            isReadOnly={true}
                                            onChange={() => {}}
                                            uiColor="emerald"
                                            key={`print-grid-separate-shared-${rInfo.id}`}
                                          />
                                       </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  renderVoucher(voucherPrintMode === "company")
                );
              })()}
            </div>

            {/* Footer Control Info Overlay on-screen (no-print) */}
            <div className="no-print bg-slate-50 border-t border-slate-200 px-6 py-4 rounded-b-xl flex justify-between items-center text-[11px] text-slate-500 font-sans">
              <span className="flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500" />
                <span>Formatos listos para impresión o exportación PDF.</span>
              </span>
              <span>
                {isInternalCopy
                  ? params.companyName || "Constructora Alba & Sánchez"
                  : "Comprobante de Liquidación"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Warranty Release Modal dialog */}
      {showWarrantyReleaseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 text-slate-800 flex flex-col max-h-full">
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0 rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5 font-sans">
                <Banknote size={16} className="text-amber-400" />
                <span>Liberación de Fondo de Garantía</span>
              </h3>
              <button
                onClick={() => setShowWarrantyReleaseModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 leading-relaxed font-sans">
                💡 Esta herramienta calcula el balance total de los fondos retenidos en garantía para un ajustero a lo largo de este proyecto, y genera una hoja de pago libre de impuestos.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Seleccionar Ajustero / Contratista:
                </label>
                <select
                  value={warrantyReleaseContractorId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setWarrantyReleaseContractorId(cid);
                    if (cid) {
                      const tot = calculateContractorWarrantyRetained(cid);
                      const rel = calculateContractorWarrantyReleased(cid);
                      const rem = Math.max(0, tot - rel);
                      setWarrantyTotalRetained(tot);
                      setWarrantyAlreadyReleased(rel);
                      setWarrantyReleaseAmountInput(rem.toFixed(2));
                    } else {
                      setWarrantyTotalRetained(0);
                      setWarrantyAlreadyReleased(0);
                      setWarrantyReleaseAmountInput("");
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[13px] font-bold text-slate-800 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 mb-2"
                >
                  <option value="">-- Selecciona Ajustero --</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
                
                {warrantyReleaseContractorId && (
                  <div className="space-y-3 mt-4 border border-slate-200 bg-slate-50/50 rounded-lg p-3 shrink-0">
                    <div className="grid grid-cols-3 gap-2 text-center font-sans">
                      <div className="bg-white border border-slate-150 rounded p-2">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Acumulado</p>
                        <p className="text-xs font-mono font-black text-slate-800">
                          {formatCurrencyValue(warrantyTotalRetained, params.currency)}
                        </p>
                      </div>
                      <div className="bg-white border border-slate-150 rounded p-2">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Ya Liberado</p>
                        <p className="text-xs font-mono font-black text-red-500">
                          {formatCurrencyValue(warrantyAlreadyReleased, params.currency)}
                        </p>
                      </div>
                      <div className="bg-white border border-slate-150 rounded p-2">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Disponible</p>
                        <p className="text-xs font-mono font-black text-emerald-600">
                          {formatCurrencyValue(Math.max(0, warrantyTotalRetained - warrantyAlreadyReleased), params.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 text-left font-sans">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Monto a Liberar (Parcial o Total):
                      </label>
                      <div className="relative rounded-md shadow-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-slate-500 text-xs font-bold font-mono">{params.currency === "USD" ? "$" : "RD$"}</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          max={Math.max(0, warrantyTotalRetained - warrantyAlreadyReleased).toFixed(2)}
                          value={warrantyReleaseAmountInput}
                          onChange={(e) => setWarrantyReleaseAmountInput(e.target.value)}
                          className="w-full pl-12 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-extrabold text-slate-900 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-405"
                        />
                      </div>
                      {Number(warrantyReleaseAmountInput) > Math.max(0, warrantyTotalRetained - warrantyAlreadyReleased) + 0.01 && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ Supera el balance disponible ({formatCurrencyValue(Math.max(0, warrantyTotalRetained - warrantyAlreadyReleased), params.currency)})
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 text-right shrink-0 bg-slate-50 rounded-b-xl flex justify-between items-center">
               <button
                  type="button"
                  onClick={() => setShowWarrantyReleaseModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
               >
                  Cancelar
               </button>
               <button
                  type="button"
                  onClick={handleCreateWarrantyReleaseSheet}
                  disabled={
                    !warrantyReleaseContractorId || 
                    !warrantyReleaseAmountInput || 
                    Number(warrantyReleaseAmountInput) <= 0 || 
                    Number(warrantyReleaseAmountInput) > Math.max(0, warrantyTotalRetained - warrantyAlreadyReleased) + 0.01
                  }
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs px-5 py-2 rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
               >
                  Generar Hoja de Liberación
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Sheet Modal dialog */}
      {showNewSheetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 text-slate-800 flex flex-col max-h-full">
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0 rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5 font-sans">
                <PlusCircle size={16} className="text-blue-400" />
                <span>Insertar Nueva Hoja de Reporte</span>
              </h3>
              <button
                onClick={() => setShowNewSheetModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            {newSheetError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-1">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <span>{newSheetError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSheet} className="p-5 space-y-4 overflow-y-auto">
              {/* Ajustero dropdown selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ajustero de la Hoja (Propietario):
                </label>
                <select
                  value={newSheetContractorId}
                  onChange={(e) =>
                    handleContractorSelectForNewSheet(e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                  required
                >
                  <option value="">
                    -- Seleccionar Ajustero Responsable --
                  </option>
                  {[...contractors]
                    .filter(c => !c.isHidden && (!c.assignedProjectIds || c.assignedProjectIds.length === 0 || c.assignedProjectIds.includes(activeProjectId)))
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5 mt-1 leading-relaxed font-sans">
                  * Al elegir un ajustero se pre-completará su ID y el nombre
                  técnico de la hoja como
                  <span className="font-bold text-blue-700 font-mono ml-1">
                    PrimerNombre (Especialidad)
                  </span>
                  .
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ID Corto (Pestaña) - Solo letras, números y guión:
                </label>
                <input
                  type="text"
                  placeholder="Ej. op2 o varill2"
                  value={newSheetCode}
                  onChange={(e) => setNewSheetCode(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-mono font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre de la Hoja de Producción:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Serafín (Varillero)"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ing. Supervisor Designado:
                </label>
                <input
                  type="text"
                  value={newSheetSupervisor}
                  onChange={(e) => setNewSheetSupervisor(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Descripción de Actividad del Lote:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Aplicación de pintura acrílica y sellador de junta de dilatación"
                  value={newSheetActivity}
                  onChange={(e) => setNewSheetActivity(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>



              <div className="border-t border-slate-100 pt-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewSheetModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 border border-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs cursor-pointer transition-all shadow-sm"
                >
                  Insertar Hoja Técnica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Insert New Report Modal dialog */}
      {showNewReportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 text-slate-800 flex flex-col max-h-full">
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0 rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5 font-sans">
                <PlusCircle size={16} className="text-emerald-400" />
                <span>Iniciar Nuevo Reporte (Corte de Pago)</span>
              </h3>
              <button
                onClick={() => setShowNewReportModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800/50 p-1 rounded-lg"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateNewReport} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1" title="El ID interno. Ej: REP-001">
                    ID / Prefijo:
                  </label>
                  <input
                    type="text"
                    placeholder={`REP-${String((activeSheet?.reports || []).length + 1).padStart(3, '0')}`}
                    value={newRepId}
                    onChange={(e) => setNewRepId(e.target.value)}
                    className={`w-full px-3 py-1 border rounded-md text-xs focus:outline-hidden font-bold ${activeSheet?.reports?.some(r => r.id === newRepId.trim()) ? 'border-red-400 bg-red-50 text-red-800 focus:border-red-500' : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'}`}
                  />
                  {activeSheet?.reports?.some(r => r.id === newRepId.trim()) && (
                    <p className="text-[10px] text-red-600 font-bold mt-1">Este ID ya existe en la hoja.</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nombre del Reporte / Corte:
                  </label>
                  <input
                    type="text"
                    placeholder={`Ej. Reporte #${(activeSheet?.reports || []).length + 1}`}
                    value={newRepName}
                    onChange={(e) => setNewRepName(e.target.value)}
                    className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* OPCION DE REPORTE EXTRAORDINARIO O COMPLEMENTARIO */}
              {(activeSheet?.reports || []).length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is-extraordinary-checkbox"
                      checked={isExtraordinary}
                      onChange={(e) =>
                        handleToggleExtraordinary(e.target.checked)
                      }
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <label
                      htmlFor="is-extraordinary-checkbox"
                      className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                    >
                      ¿Es un Reporte Extraordinario o Complementario?
                    </label>
                  </div>

                  {isExtraordinary && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500 block">
                        Vincular o Secuenciar con:
                      </label>
                      <select
                        value={parentReportId}
                        onChange={(e) =>
                          handleParentReportChange(e.target.value)
                        }
                        className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-bold"
                      >
                        {[...(activeSheet?.reports || [])].sort((a,b)=>a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({formatDateReadable(r.dateFrom)} al {formatDateReadable(r.dateTo)})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        💡 Las actividades u obras olvidadas se registrarán en
                        un nuevo subperíodo correlativo (ej:{" "}
                        <strong>{newRepName}</strong>). El cálculo de la
                        "Cantidad Anterior" tomará el acumulado de su reporte
                        principal y anteriores.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fecha Inicial:
                  </label>
                  <input
                    type="date"
                    value={newRepFrom}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewRepFrom(val);
                      if (val) {
                        setNewRepTo(getClosestSaturday(get30DaysLaterStr(val)));
                      }
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fecha Término:
                  </label>
                  <input
                    type="date"
                    value={newRepTo}
                    onChange={(e) => setNewRepTo(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-[11px] text-emerald-800 leading-relaxed font-sans">
                💡 Al iniciar este reporte, podrás ingresar las cantidades
                ejecutadas (Cant. Actual) correspondiente al nuevo rango de
                fechas. Las cantidades previas se mantendrán consolidadas en el
                historial.
              </div>

              <div className="border-t border-slate-100 pt-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewReportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={activeSheet?.reports?.some(r => r.id === newRepId.trim() && newRepId.trim() !== '')}
                  className="px-5 py-2 bg-emerald-600 border border-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs cursor-pointer transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generar Reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Current Report Modal dialog */}
      {showEditReportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 text-slate-800 flex flex-col max-h-full">
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0 rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5 font-sans">
                <Edit2 size={16} className="text-blue-400" />
                <span>Modificar Reporte (Corte de Pago)</span>
              </h3>
              <button
                onClick={() => setShowEditReportModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSaveEditReport} className="p-5 space-y-4 overflow-y-auto">
              {editRepError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <span>{editRepError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre del Reporte / Corte:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Reporte #1"
                  value={editRepName}
                  onChange={(e) => setEditRepName(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fecha Inicial:
                  </label>
                  <input
                    type="date"
                    value={editRepFrom}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditRepFrom(val);
                      if (val) {
                        setEditRepTo(
                          getClosestSaturday(get30DaysLaterStr(val)),
                        );
                      }
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fecha Término:
                  </label>
                  <input
                    type="date"
                    value={editRepTo}
                    onChange={(e) => setEditRepTo(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-[11px] text-blue-800 leading-relaxed font-sans">
                💡 Al modificar los datos de este reporte, los cambios se
                sincronizarán en todas las hojas del proyecto para mantener la
                coherencia cronológica.
              </div>

              <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const reportsList = activeSheet.reports || [];
                    if (reportsList.length <= 1) {
                      setEditRepError(
                        "No se puede eliminar el único reporte de pago existente en esta hoja. Debe mantener al menos uno.",
                      );
                      return;
                    }
                    setDeleteReportPassword("");
                    setDeleteReportPasswordError("");
                    setShowDeleteReportConfirm(true);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-105 text-rose-700 hover:text-rose-850 rounded font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 uppercase transition-all"
                  title="Eliminar este reporte de forma permanente"
                >
                  <Trash2 size={12} className="text-rose-600" />
                  <span>Eliminar Corte</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditReportModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 border border-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs cursor-pointer transition-all shadow-sm"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Report Confirmation Modal */}
      {showDeleteReportConfirm && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden text-slate-800 animate-slide-up font-sans">
            <div className="px-5 py-4 bg-rose-600 text-white flex items-center gap-2">
              <Trash2 size={16} />
              <span className="font-bold text-xs uppercase tracking-wider">
                ¿Eliminar Reporte de Pago?
              </span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[11px] leading-relaxed font-semibold text-slate-700">
                ¿Está completamente seguro de querer ELIMINAR el reporte de pago{" "}
                <strong className="text-slate-900">
                  "{selectedReport.name}"
                </strong>{" "}
                ({formatDateReadable(selectedReport.dateFrom)} al {formatDateReadable(selectedReport.dateTo)})?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-800 space-y-1">
                <p className="font-bold uppercase tracking-wider">
                  ⚠️ ADVERTENCIA CRÍTICA:
                </p>
                <p>
                  • Se perderán para siempre todas las cantidades ingresadas en
                  este corte.
                </p>
                <p>
                  • Se eliminarán todas las partidas/renglones extraordinarios
                  que se crearon en este periodo.
                </p>
                {cascadedSubReportsToDelete.length > 0 && (
                  <p className="text-rose-700 font-extrabold bg-amber-50 p-1.5 rounded border border-amber-300 mt-1">
                    💥 Al borrar "{selectedReport.name}" (reporte principal), se
                    ELIMINARÁN AUTOMÁTICAMENTE todos sus sub-reportes asociados:{" "}
                    {cascadedSubReportsToDelete
                      .map((sr) => `"${sr.name}"`)
                      .join(", ")}
                    .
                  </p>
                )}
                <p>• Los totales acumulados se recalcularán automáticamente.</p>
              </div>

              {/* Password field checking */}
              <div className="space-y-1.5 border-t border-slate-105 pt-3">
                <label className="text-[11px] font-extrabold text-slate-700 block uppercase tracking-wide">
                  🔒 Clave de Administrador:
                </label>
                <input
                  type="password"
                  placeholder="Clave de Administrador..."
                  value={deleteReportPassword}
                  onChange={(e) => {
                    setDeleteReportPassword(e.target.value);
                    setDeleteReportPasswordError("");
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-rose-500 font-mono font-bold"
                  required
                />
                {deleteReportPasswordError && (
                  <p className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1 mt-1">
                    <AlertCircle size={12} className="shrink-0 text-rose-500" />
                    <span>{deleteReportPasswordError}</span>
                  </p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteReportConfirm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-xs cursor-pointer text-[11px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteReport}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 border border-red-300 text-black rounded font-bold text-xs cursor-pointer transition-all shadow-sm flex items-center gap-1 text-[11px]"
                >
                  <Trash2 size={13} className="text-red-600" />
                  <span>Eliminar del todo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic ValidationError custom UI Modal (no iframe-blocked alert) */}
      {validationError && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden text-slate-800 animate-slide-up">
            <div className="px-5 py-4 bg-amber-500 text-white flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="font-bold text-xs uppercase tracking-wider">
                Aviso del Sistema
              </span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">
                {validationError}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="px-4 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs px-5 font-bold cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal (no iframe-blocked confirm) */}
      {showDeleteConfirm && activeSheet && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden text-slate-800 animate-slide-up">
            <div className="px-5 py-4 bg-red-600 text-white flex items-center gap-2">
              <Trash2 size={16} />
              <span className="font-bold text-xs uppercase tracking-wider">
                ¿Eliminar Hoja de Producción?
              </span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-605 leading-relaxed">
                ¿Está completamente seguro de querer ELIMINAR la hoja de
                producción de{" "}
                <strong className="text-slate-900">"{activeSheet.name}"</strong>
                ?
              </p>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-[11px] text-red-800 font-semibold leading-normal">
                ⚠️ CUIDADO: Todas las partidas de trabajo y cálculos dentro de
                esta hoja se destruirán de forma inmediata. Esta acción NO se
                puede deshacer.
              </div>
              
              {/* Password field checking */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="text-[11px] font-extrabold text-slate-700 block uppercase tracking-wide">
                  🔒 Clave de Administrador:
                </label>
                <input
                  type="password"
                  placeholder="Clave de Administrador..."
                  value={deleteSheetPassword}
                  onChange={(e) => {
                    setDeleteSheetPassword(e.target.value);
                    setDeleteSheetPasswordError("");
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-rose-500 font-mono font-bold"
                  required
                />
                {deleteSheetPasswordError && (
                  <p className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1 mt-1">
                    <AlertCircle size={12} className="shrink-0 text-rose-500" />
                    <span>{deleteSheetPasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteActiveSheet}
                  className="px-4 py-1 bg-red-100 hover:bg-red-200 border border-red-300 text-black rounded font-bold cursor-pointer shadow-xs"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Subchapter/Chapter Modal */}
      {showCreateSubchapterModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 text-slate-800 flex flex-col max-h-full">
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0 rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5 font-sans">
                <PlusCircle size={16} className="text-emerald-400" />
                <span>Crear Nuevo Capítulo</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateSubchapterModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800/50 p-1 rounded-lg"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newSubchapterDraft.trim()) {
                  handleCreateSubchapter(newSubchapterDraft);
                  setShowCreateSubchapterModal(false);
                  setNewSubchapterDraft("");
                }
              }}
              className="p-5 space-y-4 overflow-y-auto"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre del Capítulo / Nivel:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Tercer Nivel, Oficinas, etc."
                  value={newSubchapterDraft}
                  onChange={(e) => setNewSubchapterDraft(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-bold text-slate-800"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSubchapterModal(false)}
                  className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer shadow-xs"
                >
                  Crear Capítulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subchapter/Chapter Modal */}
      {showEditSubchapterModal && editingSubchapterName && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 text-slate-800 flex flex-col max-h-full">
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0 rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5 font-sans">
                <Edit2 size={15} className="text-blue-400" />
                <span>Modificar Capítulo</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditSubchapterModal(false);
                  setEditingSubchapterName(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800/50 p-1 rounded-lg"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newSubchapterDraft.trim() && editingSubchapterName) {
                  handleRenameSubchapter(editingSubchapterName, newSubchapterDraft);
                  setShowEditSubchapterModal(false);
                  setEditingSubchapterName(null);
                  setNewSubchapterDraft("");
                }
              }}
              className="p-5 space-y-4 overflow-y-auto"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Nombre Original:
                </label>
                <div className="px-3 py-1 bg-slate-100 rounded-md text-xs font-mono text-slate-600 select-all">
                  {editingSubchapterName}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nuevo Nombre del Capítulo:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Planta Baja, Penthouse, etc."
                  value={newSubchapterDraft}
                  onChange={(e) => setNewSubchapterDraft(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-bold text-slate-800"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubchapterModal(false);
                    setEditingSubchapterName(null);
                  }}
                  className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer shadow-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Close Modal */}
      {showSignatureCloseModal && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 text-slate-800 flex flex-col max-h-full">
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0 rounded-t-xl">
              <h3 className="text-sm font-bold flex items-center gap-1.5 font-sans">
                <PenTool size={16} className="text-amber-400 animate-pulse" />
                <span>Autorización y Firma Digital de Cierre</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSignatureCloseModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800/50 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs leading-relaxed text-slate-600">
                <p className="font-bold text-slate-800 mb-1">
                  Certificación de Cierre y Aprobación
                </p>
                Al firmar este reporte, certifico en calidad de supervisor / ingeniero de obra de <strong className="text-slate-800">MARES SRL</strong> que las cubicaciones y cantidades registradas en el periodo del <strong className="text-slate-800">{formatDateReadable(selectedReport.dateFrom || '')}</strong> al <strong className="text-slate-800">{formatDateReadable(selectedReport.dateTo || '')}</strong> para el contratista <strong className="text-slate-800">{activeContractor?.name || 'Ajustero'}</strong> son correctas, verificadas físicamente en campo, y cumplen los estándares establecidos.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Firma del Supervisor (Dibuje su trazo en el recuadro):
                </label>
                <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-white h-44 shadow-inner">
                  <canvas
                    ref={(canvas) => {
                      if (canvas) {
                        canvasRef.current = canvas;
                      }
                    }}
                    onPointerDown={(e) => {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      if (!hasDrawn) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        setHasDrawn(true);
                      }
                      isDrawingRef.current = true;
                      try {
                        canvas.setPointerCapture(e.pointerId);
                      } catch (err) {}
                      ctx.beginPath();
                      const rect = canvas.getBoundingClientRect();
                      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    }}
                    onPointerMove={(e) => {
                      if (!isDrawingRef.current) return;
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      const rect = canvas.getBoundingClientRect();
                      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                      ctx.strokeStyle = "#0f172a";
                      ctx.lineWidth = 2.5;
                      ctx.lineCap = "round";
                      ctx.lineJoin = "round";
                      ctx.stroke();
                    }}
                    onPointerUp={(e) => {
                      isDrawingRef.current = false;
                      const canvas = canvasRef.current;
                      if (canvas) {
                        try {
                          canvas.releasePointerCapture(e.pointerId);
                        } catch (err) {}
                      }
                    }}
                    onPointerCancel={() => {
                      isDrawingRef.current = false;
                    }}
                    className="w-full h-full block cursor-crosshair bg-white touch-none"
                  />
                  
                  <button
                    type="button"
                    onClick={() => {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                      setHasDrawn(false);
                      setLoadedDefaultSignature(true);
                    }}
                    className="absolute bottom-2.5 right-2.5 bg-slate-100/90 hover:bg-slate-200 text-slate-705 font-extrabold text-[10px] uppercase font-mono px-2.5 py-1 rounded border border-slate-300 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    Limpiar Lienzo
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowSignatureCloseModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!hasDrawn}
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const signatureDataUrl = canvas.toDataURL("image/png");
                    handleConfirmCloseWithSignature(signatureDataUrl);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded cursor-pointer shadow-sm disabled:opacity-50 disabled:bg-rose-300 disabled:cursor-not-allowed uppercase font-mono text-[11px] tracking-wider"
                >
                  Confirmar y Firmar Cierre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Measurement Support Sidebar */}
      {measurementSupportState && activeSheet && (() => {
        const row = activeSheet.rows.find(r => r.id === measurementSupportState.rowId);
        if (!row) return null;
        const contractor = contractors.find(c => c.id === row.contractorId);
        const rep = activeSheet.reports?.find(r => r.id === selectedReportId) || activeSheet.reports?.[activeSheet.reports.length - 1];
        const isClosed = rep?.status === "CERRADO";
        
        const isQuantity = measurementSupportState.type === "quantity";
        const currentFormula = isQuantity ? (row.quantityFormula || "") : ((rep?.formulas || {})[row.id] || "");
        const uiColor = isQuantity ? "blue" : "amber";
        
        const gridDataStr = isQuantity ? row.quantityGrid : (rep?.grids || {})[row.id];
        let isGridConnected = true;
        try {
          if (gridDataStr) {
            const gridData = JSON.parse(gridDataStr);
            if (gridData.useGridTotal === false) isGridConnected = false;
          }
        } catch (e) {}

        const innerContent = (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className={`support-drag-handle px-5 py-4 border-b border-slate-100 bg-${uiColor}-500 text-white flex items-center justify-between cursor-move shrink-0`}>
              <div className="flex items-center gap-2 pointer-events-none">
                 <FileText size={18} />
                 <h3 className="font-bold uppercase tracking-wider text-sm text-white/90 select-none">Soporte de Medición</h3>
              </div>
              <button onClick={(e) => {
                  e.stopPropagation();
                  setMeasurementSupportState(null);
                  setMeasurementModalPos({x: 0, y: 0});
              }} className="cancel-drag text-white border-0 hover:bg-white/20 p-1 rounded-full cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 max-md:p-2 flex-1 overflow-y-auto bg-slate-50 flex flex-col gap-6 max-md:gap-3 overscroll-none" style={{ touchAction: 'auto' }}>
              <div className="bg-white p-4 max-md:p-2 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Actividad</span>
                      <span className="text-xs font-bold text-slate-800 leading-snug">{row.subchapter ? `${row.subchapter} / ` : ''}{row.description}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ajustador</span>
                          <span className="text-xs font-bold text-slate-700">{contractor?.name || "Desconocido"}</span>
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Target</span>
                          <span className={`text-xs font-bold font-mono text-${uiColor}-600 bg-${uiColor}-50 px-2 py-0.5 rounded w-fit max-w-full truncate`}>
                            {isQuantity ? "Presupuesto (Cant.)" : (rep?.name || "#")}
                          </span>
                       </div>
                   </div>
              </div>
              
              <div className="flex-1 flex flex-col min-h-0 gap-4 max-md:gap-2">
                <div className="space-y-2 max-md:space-y-1 shrink-0">
                  <label className={`text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block flex items-center gap-1.5 focus-within:text-${uiColor}-600`}>
                     <Calculator size={12} />
                     Fórmula Utilizada
                  </label>
                  <AutoResizingTextarea 
                     rows={1}
                     className={`w-full px-3 py-2 max-md:py-1 bg-white border border-slate-300 rounded font-mono text-xs focus:outline-hidden focus:border-${uiColor}-500 text-slate-800 shadow-inner block transition-all resize-none overflow-hidden ${isGridConnected ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`}
                     placeholder="Ej: =2*3.14+0.5"
                     value={currentFormula}
                     disabled={isGridConnected || isClosed}
                     onChange={(e) => {
                         if(!isQuantity && !rep) return;
                         const val = e.target.value;
                         handleCellChangeCustom(row.id, measurementSupportState.type, val.startsWith('=') ? evaluateMathExpression(val.substring(1)) : (parseFloat(val.replace(/,/g, '.')) || 0), val);
                     }}
                     onBlur={(e) => {
                         if(!isQuantity && !rep) return;
                         const val = e.target.value;
                         handleCellChangeCustom(row.id, measurementSupportState.type, val.startsWith('=') ? evaluateMathExpression(val.substring(1)) : (parseFloat(val.replace(/,/g, '.')) || 0), val);
                     }}
                     onKeyDown={(e) => {
                         if (e.key === "Enter" && !e.shiftKey) {
                           e.preventDefault();
                           e.currentTarget.blur();
                         } else if (e.key === "Escape") {
                           e.preventDefault();
                           e.currentTarget.blur();
                         }
                     }}
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">La fórmula se evalúa automáticamente al cambiar o presionar Enter. Inicie con '=' (Ej: =12.5*2.4).</p>
                </div>

                <div className="flex-1 flex flex-col min-h-0 border-t border-slate-200 pt-3 relative z-0 overscroll-contain" style={{ overscrollBehavior: "contain" }}>
                   <MeasurementGrid 
                      key={`${measurementSupportState.rowId}-${measurementSupportState.type}`}
                      uiColor={uiColor as any}
                      initialData={isQuantity ? row.quantityGrid : (rep?.grids || {})[row.id]}
                      isReadOnly={isClosed}
                      onChange={(gridJson, computedTotal, formulaText) => {
                         if(!isQuantity && !rep) return;
                         // We save the JSON grid, compute actual numerical value, and automatically replace "Fórmula Utilizada" with spreadsheet formula/value
                         handleCellChangeCustom(
                           row.id, 
                           measurementSupportState.type, 
                           computedTotal,
                           formulaText !== undefined && formulaText !== "" ? formulaText : currentFormula,
                           gridJson
                         );
                      }}
                   />
                </div>

                <div className="space-y-2 max-md:space-y-1 shrink-0 border-t border-slate-200 pt-3">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block flex items-center gap-1.5 focus-within:text-amber-600">
                     <FileText size={12} />
                     Notas y Observaciones
                  </label>
                  <textarea 
                     rows={2}
                     className="w-full px-3 py-2 max-md:py-1 bg-white border border-slate-300 rounded text-xs focus:outline-hidden focus:border-amber-500 text-slate-800 shadow-inner resize-y transition-all"
                     placeholder="Notas privadas o descripción de la medición..."
                     defaultValue={row.observations}
                     onChange={(e) => handleCellChangeCustom(row.id, "observations", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );

        if (window.innerWidth < 768) {
          return (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden animate-fade-in pointer-events-auto overscroll-none" style={{ touchAction: 'none' }}>
              <div className="flex-1 flex flex-col w-full h-full overflow-hidden" style={{ touchAction: 'auto' }}>
                {innerContent}
              </div>
            </div>
          );
        }

        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8 pointer-events-none">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs pointer-events-auto" onClick={() => setMeasurementSupportState(null)} />
            <Rnd
              default={{
                x: window.innerWidth * 0.05,
                y: window.innerHeight * 0.05,
                width: '90vw',
                height: '90vh'
              }}
              minWidth={300}
              minHeight={400}
              bounds="window"
              dragHandleClassName="support-drag-handle"
              cancel=".cancel-drag"
              className="bg-white shadow-2xl flex flex-col overflow-hidden animate-fade-in pointer-events-auto border border-[rgba(0,0,0,0.1)] rounded-xl"
              style={{ position: 'absolute' }}
            >
              {innerContent}
            </Rnd>
          </div>
        );
      })()}

    </div>
  );
}
