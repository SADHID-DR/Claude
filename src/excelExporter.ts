/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx-js-style';
import { ProjectParams, Contractor, ProductionSheet, CalculatedRow } from './types';
import { calculateRow } from './data';

// Helper to determine previous, actual, and accumulated quantities from reports
function getSheetRowQuantities(sheet: ProductionSheet, rowId: string, activeReportId?: string) {
  const reports = sheet.reports || [];
  
  // Find active report (by default, the latest closed or active report)
  let activeReport = reports.find(r => r.id === activeReportId);
  if (!activeReport && reports.length > 0) {
    activeReport = reports[reports.length - 1]; // fallback to latest report
  }
  
  if (!activeReport) {
    return { prev: 0, actual: 0, accum: 0 };
  }
  
  const actualQty = activeReport.quantities?.[rowId] ?? 0;
  
  let prevQty = 0;
  const activeIndex = reports.findIndex(r => r.id === activeReport.id);
  if (activeIndex > 0) {
    for (let i = 0; i < activeIndex; i++) {
      prevQty += reports[i].quantities?.[rowId] ?? 0;
    }
  }
  
  const accumQty = prevQty + actualQty;
  return {
    prev: prevQty,
    actual: actualQty,
    accum: accumQty
  };
}

export function buildExcelWorkbook(
  params: ProjectParams,
  contractors: Contractor[],
  sheets: ProductionSheet[],
  includeItbisInNet: boolean
) {
  // Create an Excel Workbook
  const wb = XLSX.utils.book_new();

  // 1. SHEET: INSTRUCCIONES / RESUMEN
  const introData = [
    ["SISTEMA DE CONTROL DE NÓMINA DE CONTRATISTAS Y SUBCONTRATISTAS (CANTIDADES REPRODUCIDAS POR REPORTES)"],
    ["ESTE ARCHIVO FUE GENERADO AUTOMÁTICAMENTE POR EL SISTEMA ADMINISTRATIVE WEB — MARESNOMINAS"],
    [],
    ["PROYECTO:", params.projectName],
    ["COMPAÑÍA:", params.companyName],
    ["DIRECCIÓN:", params.address],
    ["SUPERVISOR GENERAL:", params.responsible],
    ["MONEDA DE OPERACIÓN:", params.currency],
    [],
    ["DETALLE DE LAS WORKCOMP SHEETS:"],
    ["1. tblParametros - Tasas de impuestos secundarias y retenciones globales."],
    ["2. Contratistas - Registro y base de datos con información de contacto y cuentas bancarias."],
    ["3. RESUMEN GENERAL - Consolidación de todos los reportes de producción activos."],
    ["4. [Hojas Individuales] - Detalle del trabajo ejecutado (Bloque Presupuesto + Bloque Reporte Actual + Cantidad Anterior)"],
    [],
    ["Generado en el dispositivo el:", new Date().toLocaleDateString("es-DO") + " " + new Date().toLocaleTimeString("es-DO")]
  ];
  const wsIntro = XLSX.utils.aoa_to_sheet(introData);
  XLSX.utils.book_append_sheet(wb, wsIntro, "Inicio_Instrucciones");

  // 2. SHEET: tblParametros (Parameters Table)
  const paramsData = [
    ["TABLA DE PARÁMETROS FINANCIEROS Y DE IMPUESTOS (tblParametros)"],
    [],
    ["Parámetro", "Valor Porcentual", "Descripción"],
    ["% Retención Impuesto Sobre la Renta (ISR)", params.percentIsr / 100, "Retención de ISR aplicable al valor bruto de contratistas"],
    ["% Retención TSS (Seguridad Social)", params.percentTss / 100, "Porcentaje retenido por concepto de seguridad social"],
    ["% Retención Fondo de Pensiones Ley 6-86", params.percentPension / 100, "Retención por concepto de fondo de pensiones (Ley 6-86)"],
    ["% Retención Fondo de Garantía", params.percentWarranty / 100, "Retención de garantía por vicios ocultos (desembolsable al cierre)"],
    ["% Transferencia de Bienes y Servicios (ITBIS)", params.percentItbis / 100, "Tasa de ITBIS local calculada"],
    [],
    ["DATO GENERAL DEL PROYECTO", "VALOR REGISTRADO"],
    ["Nombre Empresa", params.companyName],
    ["Proyecto", params.projectName],
    ["Dirección", params.address],
    ["Supervisor Director", params.responsible],
    ["Moneda", params.currency],
    ["Configuración Neto incluye ITBIS", includeItbisInNet ? "SI" : "NO"]
  ];
  const wsParams = XLSX.utils.aoa_to_sheet(paramsData);
  // Format column percentages
  if (wsParams['B4']) wsParams['B4'].t = 'n';
  if (wsParams['B5']) wsParams['B5'].t = 'n';
  if (wsParams['B6']) wsParams['B6'].t = 'n';
  if (wsParams['B7']) wsParams['B7'].t = 'n';
  if (wsParams['B8']) wsParams['B8'].t = 'n';
  XLSX.utils.book_append_sheet(wb, wsParams, "tblParametros");

  // 3. SHEET: Contratistas (Contractors Database)
  const contractorsHeader = [
    ["REGISTRO GENERAL DE CONTRATISTAS Y SUBCONTRATISTAS"],
    [],
    ["ID Contratista", "Nombre Completo", "Cédula / RNC / Pasaporte", "Teléfono", "Dirección", "Especialidad / Tipo", "Estado", "Banco Receptor", "Cuenta Bancaria", "Correo Electrónico", "Observaciones"]
  ];
  const contractorsRows = contractors.map(c => [
    c.id, c.name, c.document, c.phone, c.address, c.type, c.status, c.bank, c.account, c.email, c.observations
  ]);
  const wsContractors = XLSX.utils.aoa_to_sheet([...contractorsHeader, ...contractorsRows]);
  XLSX.utils.book_append_sheet(wb, wsContractors, "Contratistas");

  // 4. SHEETS: Production Sheets (Individual worksheets OP1, ALB, etc.)
  let consolidatedList: any[] = [];
  
  const activeSheets = sheets.filter(
    s => contractors.some(c => c.id === s.contractorId)
  );
  
  activeSheets.forEach(sheet => {
    // Excel sheet name limit is 31 characters. Avoid illegal chars: \ / ? * : [ ]
    let sheetTitle = sheet.name.replace(/[:\?\*\/\\\[\]]/g, "").trim();
    if (sheetTitle.length > 28) {
      sheetTitle = sheetTitle.substring(0, 28) + "...";
    }
    
    const sheetContractor = contractors.find(c => c.id === sheet.contractorId);
    const contractorName = sheetContractor ? sheetContractor.name : "No asignado";
    const contractorDoc = sheetContractor ? sheetContractor.document : "S/D";

    // Detect the chosen active/latest report level
    const reports = sheet.reports || [];
    const activeReport = reports[reports.length - 1]; // latest report as default active reference for Excel
    const activeReportName = activeReport ? activeReport.name : "Reporte Inicial";

    const prodHeader = [
      ["SISTEMA DE REPORTES ACUMULADOS - NÓMINAS — " + sheetTitle.toUpperCase()],
      ["Proyecto:", params.projectName, "", "Actividad Lote:", sheet.activity],
      ["Código Ajuste:", sheet.code, "", "Moneda:", params.currency],
      ["Contratista:", contractorName, "", "Documento/RNC:", contractorDoc],
      ["Supervisor:", sheet.supervisor, "", "Empresa Matriz:", params.companyName],
      ["Corte de Pago:", activeReportName, "", "Periodo:", `Desde ${sheet.dateFrom || "N/D"} hasta ${sheet.dateTo || "N/D"}`],
      [],
      [
        "No.", 
        "Subcapítulo (Sección)",
        "Descripción de Trabajo", 
        "Cant. Presup.", 
        "Unidad", 
        "P. Unitario", 
        "Valor Presup.",
        "Cant. Anterior",
        "Cant. Actual",
        "Cant. Acumulada",
        "% Avance",
        "Valor Actual",
        "Valor Acumulado",
        "Observaciones"
      ]
    ];

    let runningPresup = 0;
    let runningActual = 0;
    let runningAccum = 0;

    const prodRows = sheet.rows.map((row, index) => {
      const q = getSheetRowQuantities(sheet, row.id, activeReport?.id);
      
      const valPresup = row.quantity * row.priceUnit;
      const valActual = q.actual * row.priceUnit;
      const valAccum = q.accum * row.priceUnit;

      runningPresup += valPresup;
      runningActual += valActual;
      runningAccum += valAccum;

      // Add to consolidated master structure
      consolidatedList.push({
        sheetName: sheet.name,
        lineNo: index + 1,
        contractorName: contractorName,
        contractorDoc: contractorDoc,
        subchapter: row.subchapter || "Primer Nivel",
        grossValue: valActual, // The gross value in the active report
        description: row.description,
        activity: sheet.activity
      });

      const pctAvance = row.quantity > 0 ? ((q.accum / row.quantity) * 100).toFixed(1) + "%" : "0.0%";

      return [
        row.no || index + 1,
        row.subchapter || "Primer Nivel",
        row.description,
        row.quantity,
        row.unit,
        row.priceUnit,
        valPresup,
        q.prev,
        q.actual,
        q.accum,
        pctAvance,
        valActual,
        valAccum,
        row.observations || ""
      ];
    });

    const firstDataRow = 9; // 1-indexed
    const lastDataRow = 8 + prodRows.length; // 1-indexed
    const sumIfPossible = (colLetter: string) => {
        if (prodRows.length === 0) return 0;
        return { f: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})` };
    };

    // Add totals row at bottom
    const totalRow = [
      "TOTAL VALORACIONES", "", "", "", "", "",
      sumIfPossible('G'), // index 6
      "", "", "", "",
      sumIfPossible('L'), // index 11
      sumIfPossible('M'),  // index 12
      ""
    ];

    // Compute dynamic tax details for this sheet based on active report
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

    const isItbisInclusive = isClosed && activeReport.savedIsItbisInclusive !== undefined
      ? activeReport.savedIsItbisInclusive === true
      : params.isItbisInclusive === true;

    const sheetItbisPercent = isClosed && activeReport.savedItbisRate !== undefined
      ? activeReport.savedItbisRate
      : (typeof sheet.itbisRate === 'number' ? sheet.itbisRate : params.percentItbis);

    const effPercentIsr = isClosed && activeReport.savedPercentIsr !== undefined
      ? activeReport.savedPercentIsr
      : params.percentIsr;

    const effPercentTss = isClosed && activeReport.savedPercentTss !== undefined
      ? activeReport.savedPercentTss
      : params.percentTss;

    const effPercentPension = isClosed && activeReport.savedPercentPension !== undefined
      ? activeReport.savedPercentPension
      : params.percentPension;

    const effPercentWarranty = isClosed && activeReport.savedPercentWarranty !== undefined
      ? activeReport.savedPercentWarranty
      : params.percentWarranty;

    const baseRunningActual = (applyItbis && isItbisInclusive)
      ? (runningActual / (1 + (sheetItbisPercent / 100)))
      : runningActual;

    const isrVal = applyIsr ? baseRunningActual * (effPercentIsr / 100) : 0;
    const tssVal = applyTss ? baseRunningActual * (effPercentTss / 100) : 0;
    const pensionVal = applyPension ? baseRunningActual * (effPercentPension / 100) : 0;
    const warrantyVal = applyWarranty ? baseRunningActual * (effPercentWarranty / 100) : 0;
    
    const itbisVal = applyItbis
      ? (isItbisInclusive ? runningActual - baseRunningActual : runningActual * (sheetItbisPercent / 100))
      : 0;

    const discount1 = activeReport?.discount1 || 0;
    const discount2 = activeReport?.discount2 || 0;
    const disc1Label = activeReport?.discount1Label || "Deducción Especial A";
    const disc2Label = activeReport?.discount2Label || "Deducción Especial B";

    let netVal = 0;
    if (isItbisInclusive) {
      netVal = includeItbisInNet
        ? runningActual - (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2)
        : baseRunningActual - (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2);
    } else {
      netVal = includeItbisInNet
        ? (runningActual + itbisVal) - (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2)
        : runningActual - (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2);
    }

    const taxLiquidationRows = [
      [],
      ["LIQUIDACIÓN INTEGRAL Y DESCUENTOS AL PIE (NÓMINAS MARES)"],
      ["Concepto Financiero", "Fórmula de Tasa", "Monto Calculado ($)"],
      ["VALOR BRUTO EJECUTADO EN EL ACTUAL", isItbisInclusive ? "Incluye ITBIS" : "Suma de Partidas", runningActual],
      isItbisInclusive ? ["BASE EXCENTA DE ITBIS (VALOR CONTRACTUAL BASE)", "Bruto / (1 + Tasa ITBIS)", baseRunningActual] : null,
      applyIsr ? ["Impuesto Sobre la Renta (ISR)", `${effPercentIsr}%`, -isrVal] : null,
      applyTss ? ["Retención Seguridad Social (TSS)", `${effPercentTss}%`, -tssVal] : null,
      applyPension ? ["Fondo de Pensiones Ley 6-86", `${effPercentPension}%`, -pensionVal] : null,
      applyWarranty ? ["Amortización de Anticipo / Retención Garantía", `${effPercentWarranty}%`, -warrantyVal] : null,
      discount1 > 0 ? [`Deducción Especial: ${disc1Label}`, "Manual", -discount1] : null,
      discount2 > 0 ? [`Deducción Especial: ${disc2Label}`, "Manual", -discount2] : null,
      applyItbis ? (isItbisInclusive ? ["ITBIS (Incluido en Bruto)", `${sheetItbisPercent}% (Incluido)`, -itbisVal] : ["ITBIS Adicionado al Neto", `${sheetItbisPercent}%`, itbisVal]) : null,
      ["(=) NETO EFECTIVO A PAGAR (CONTRATISTA)", "Balance Final", netVal]
    ].filter(Boolean) as any[][];

    // Firmas section
    const signaturesRows = [
      [],
      [],
      ["PREPARADO POR (SUPERVISOR)", "", "REVISADO POR (AUDITORÍA)", "", "APROBADO POR (DIRECTOR GENERAL)"],
      ["_______________________________", "", "_______________________________", "", "_______________________________"],
      [sheet.supervisor || params.responsible, "", "Auditor / Control Interno", "", "Director General Proyectos"],
      ["Fecha: ____/____/_____", "", "Fecha: ____/____/_____", "", "Fecha: ____/____/_____"]
    ];

    // --- MEASUREMENT GRIDS SECTION ---
    let currentRowOffset = prodHeader.length + prodRows.length + 1 + 1 + taxLiquidationRows.length + signaturesRows.length;
    const gridsAoA: any[][] = [];
    const additionalHighlights: {row: number, colStr: string | null, style: any}[] = [];

    const gridsInSheet: Array<{ rowName: string; formulaUsed: string; gridJson: string }> = [];
    sheet.rows.forEach(r => {
        const gridJson = activeReport?.grids?.[r.id] || r.quantityGrid;
        const formulaUsed = activeReport?.formulas?.[r.id] || r.quantityFormula || "";
        if (gridJson) {
            gridsInSheet.push({
               rowName: `${r.subchapter || "General"} / ${r.description}`,
               formulaUsed,
               gridJson
            });
        }
    });

    if (gridsInSheet.length > 0) {
       gridsAoA.push([]); // spacing
       gridsAoA.push(["SOPORTES DE MEDICIÓN Y CÁLCULOS ASOCIADOS"]);
       additionalHighlights.push({ row: currentRowOffset + 2, colStr: 'A', style: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0EA5E9" } }, sz: 12 } });
       currentRowOffset += 2;
       
       gridsInSheet.forEach(item => {
           gridsAoA.push([]);
           gridsAoA.push([`Actividad: ${item.rowName}`]);
           additionalHighlights.push({ row: currentRowOffset + 2, colStr: 'A', style: { font: { bold: true }, fill: { fgColor: { rgb: "F1F5F9" } } } });
           currentRowOffset += 2;

           if (item.formulaUsed) {
               gridsAoA.push([`Fórmula Resumen: ${item.formulaUsed}`]);
               currentRowOffset += 1;
           }
           
           let grid: any;
           try { grid = JSON.parse(item.gridJson); } catch (e) {}
           if (grid && grid.cols && grid.rows && grid.cells) {
               const baseCol = 2; // Will place grid starting at C
               const baseRow = currentRowOffset;
               
               const headers = ["", ""]; // A, B
               for(let c=0; c<grid.cols; c++) {
                   headers.push(String.fromCharCode(65 + c)); // C, D, E...
               }
               gridsAoA.push(headers);
               for(let c=0; c<grid.cols; c++) {
                   additionalHighlights.push({ row: baseRow + 1, colStr: String.fromCharCode(67 + c), style: { fill: { fgColor: { rgb: "E2E8F0" } }, font: { bold: true }, alignment: { horizontal: "center" } } });
               }
               currentRowOffset += 1;
               
               const mapLocalToExcel = (localCell: string) => {
                    const colStrMatch = localCell.match(/^[A-Z]+/i);
                    const rowStrMatch = localCell.match(/[0-9]+$/);
                    if (!colStrMatch || !rowStrMatch) return localCell;
                    const colStr = colStrMatch[0].toUpperCase();
                    let localCol = 0;
                    for(let i=0; i<colStr.length; i++) {
                        localCol = localCol * 26 + (colStr.charCodeAt(i) - 64);
                    }
                    localCol -= 1; 
                    const localRow = parseInt(rowStrMatch[0], 10); 
                    return XLSX.utils.encode_cell({ c: baseCol + localCol, r: baseRow + localRow });
               };

               for(let r=1; r<=grid.rows; r++) {
                   const rowArray: any[] = ["", r.toString()];
                   additionalHighlights.push({ row: currentRowOffset + 1, colStr: 'B', style: { fill: { fgColor: { rgb: "E2E8F0" } }, font: { bold: true }, alignment: { horizontal: "center" } } });
                   for(let c=0; c<grid.cols; c++) {
                       const cellId = `${String.fromCharCode(65+c)}${r}`;
                       const val = grid.cells[cellId] || "";
                       if (val.startsWith("=")) {
                           const translated = val.substring(1).replace(/[A-Z]+[0-9]+/gi, (match: string) => mapLocalToExcel(match));
                           rowArray.push({ f: translated });
                       } else {
                           const num = parseFloat(val);
                           if (!isNaN(num) && val.trim() !== "") {
                               rowArray.push({ v: num, t: "n" });
                           } else {
                               rowArray.push(val);
                           }
                       }
                   }
                   gridsAoA.push(rowArray);
                   currentRowOffset += 1;
               }
               
               if (grid.totalCell) {
                   gridsAoA.push(["", "TOTAL:", { f: mapLocalToExcel(grid.totalCell) }]);
                   additionalHighlights.push({ row: currentRowOffset + 1, colStr: 'C', style: { font: { bold: true, color: { rgb: "047857" } }, fill: { fgColor: { rgb: "D1FAE5" } } } });
                   currentRowOffset += 1;
               }
           }
       });
    }

    const wsProd = XLSX.utils.aoa_to_sheet([
      ...prodHeader, 
      ...prodRows, 
      [], 
      totalRow, 
      ...taxLiquidationRows,
      ...signaturesRows,
      ...gridsAoA
    ]);

    // Format column widths
    wsProd['!cols'] = [
      { wch: 6 },  // A: No.
      { wch: 25 }, // B: Subcapítulo
      { wch: 45 }, // C: Desc
      { wch: 12 }, // D: Cant Presup
      { wch: 10 }, // E: Unidad
      { wch: 15 }, // F: PU
      { wch: 15 }, // G: Valor Presup
      { wch: 12 }, // H: Cant Ant
      { wch: 12 }, // I: Cant Act
      { wch: 12 }, // J: Cant Acum
      { wch: 10 }, // K: Avance
      { wch: 15 }, // L: Valor Act
      { wch: 15 }, // M: Valor Acum
      { wch: 20 }, // N: Observ
    ];

    // Apply styles to prod sheet
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } },
      alignment: { vertical: "center", textRotation: 0 }
    };
    const titleStyle = { font: { bold: true, sz: 12 }, fill: { fgColor: { rgb: "F1F5F9" } } };
    const summaryStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FEF3C7" } } };
    const taxHeaderStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } } };

    const totalRowIndex = prodHeader.length + prodRows.length + 1; // 1-based index (header + rows + empty line + total)

    Object.keys(wsProd).forEach(key => {
      if (key.startsWith('!')) return;
      const cell = wsProd[key];
      const rowNum = parseInt(key.replace(/[A-Z]/g, ''), 10);
      const colStr = key.replace(/[0-9]/g, '');

      if (!cell.s) cell.s = {};

      // Currency formatting for amounts
      if (['F','G','L','M'].includes(colStr) && rowNum > 8 && typeof cell.v === 'number') {
        cell.s.numFmt = '#,##0.00';
      }
      // Formatting for quantities
      if (['D','H','I','J'].includes(colStr) && rowNum > 8 && typeof cell.v === 'number') {
        cell.s.numFmt = '#,##0.00';
      }

      // Title row
      if (rowNum === 1) cell.s = { font: { bold: true, sz: 14, color: { rgb: "0F172A" } } };
      
      // Metadata fields
      if (rowNum >= 2 && rowNum <= 6) {
        if (['A','C','D'].includes(colStr)) cell.s = { font: { bold: true, color: { rgb: "475569" } } };
      }

      // Headers at row 8
      if (rowNum === 8) cell.s = headerStyle;

      // Highlight "TOTAL VALORACIONES" row
      if (rowNum === totalRowIndex) {
        cell.s = summaryStyle;
      }
      
      // Tax section styling
      const taxSectionStartRow = totalRowIndex + 2;
      if (rowNum === taxSectionStartRow) {
         cell.s = { font: { bold: true, sz: 12 } };
      } else if (rowNum === taxSectionStartRow + 1) {
         cell.s = taxHeaderStyle; // "Concepto Financiero", etc.
      } else if (rowNum > taxSectionStartRow + 1 && typeof cell.v === 'number') {
         cell.s.numFmt = '#,##0.00'; // Liquidacion values
      }
    });

    additionalHighlights.forEach(hl => {
        const ref = hl.colStr ? `${hl.colStr}${hl.row}` : null;
        if (ref && wsProd[ref]) {
            if (!wsProd[ref].s) wsProd[ref].s = {};
            Object.assign(wsProd[ref].s, hl.style);
        }
    });

    XLSX.utils.book_append_sheet(wb, wsProd, sheetTitle);
  });

  // 5. SHEET: RESUMEN GENERAL (Consolidated Report)
  const masterSummaryHeader = [
    ["RESUMEN CONSOLIDADO DE REPORTE ACTUAL GENERAL (RESUMEN #1)"],
    ["Filtrado por todas las hojas de reporte con trabajos del corte activo"],
    [],
    [
      "Contratista (Hoja)", 
      "No. Renglón", 
      "Concepto de Trabajo",
      "Valor Acumulado Bruto"
    ]
  ];

  let sumGross = 0;

  const masterSummaryRows = consolidatedList.map(item => {
    sumGross += item.grossValue;

    return [
      `${item.contractorName} (${item.sheetName})`,
      item.lineNo,
      `${item.activity} - ${item.description}`,
      item.grossValue
    ];
  });

  const totalsSummaryRow = [
    "TOTAL GENERAL BRUTO", "", "", sumGross
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet([...masterSummaryHeader, ...masterSummaryRows, [], totalsSummaryRow]);

  wsSummary['!cols'] = [
    { wch: 35 }, 
    { wch: 15 }, 
    { wch: 55 },
    { wch: 25 }
  ];

  Object.keys(wsSummary).forEach(key => {
     if (key.startsWith('!')) return;
     const cell = wsSummary[key];
     const rowNum = parseInt(key.replace(/[A-Z]/g, ''), 10);
     const colStr = key.replace(/[0-9]/g, '');

     if (!cell.s) cell.s = {};
     
     if (rowNum === 1) cell.s = { font: { bold: true, sz: 14 } };
     if (rowNum === 4) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } } };
     if (colStr === 'D' && rowNum > 4 && typeof cell.v === 'number') {
        cell.s.numFmt = '#,##0.00';
     }
     if (rowNum === masterSummaryHeader.length + masterSummaryRows.length + 2) {
        cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "FEF3C7" } } };
        if (colStr === 'D') cell.s.numFmt = '#,##0.00';
     }
  });

  XLSX.utils.book_append_sheet(wb, wsSummary, "RESUMEN_GENERAL");
  return wb;
}

export function exportSystemToExcel(
  params: ProjectParams,
  contractors: Contractor[],
  sheets: ProductionSheet[],
  includeItbisInNet: boolean
) {
  const wb = buildExcelWorkbook(params, contractors, sheets, includeItbisInNet);
  XLSX.writeFile(wb, `Nomina_Contratistas_${params.projectName.replace(/\s+/g, '_')}_Reportes_Acumulados.xlsx`);
}

export function exportSystemToExcelBlob(
  params: ProjectParams,
  contractors: Contractor[],
  sheets: ProductionSheet[],
  includeItbisInNet: boolean
): Blob {
  const wb = buildExcelWorkbook(params, contractors, sheets, includeItbisInNet);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
