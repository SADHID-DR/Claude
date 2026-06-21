import React, { useState, useRef, useEffect } from "react";
import { Maximize2, Minimize2, Plus, Trash2, CheckCircle2, Sigma, Bold, Italic, Palette, Baseline, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Rnd } from "react-rnd";

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bg?: string;
  decimals?: number;
  align?: 'left' | 'center' | 'right';
}

export interface GridData {
  cols: number;
  rows: number;
  cells: Record<string, string>;
  totalCell: string | null;
  useGridTotal?: boolean;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  cellFormats?: Record<string, CellFormat>;
}

export const evaluateMathExpression = (expr: string): number => {
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

export const formatNumberStr = (valStr: string | number | undefined, isNum: boolean, format?: CellFormat) => {
   if (valStr === undefined || valStr === "ERR" || valStr === "") return valStr;
   if (isNum || !isNaN(Number(valStr))) {
      const num = Number(valStr);
      if (isNaN(num)) return valStr;
      if (format?.decimals !== undefined) {
         return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: format.decimals,
            maximumFractionDigits: format.decimals
         }).format(num);
      }
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(num);
   }
   return String(valStr);
};

interface MeasurementGridProps {
  key?: string | number;
  initialData?: string;
  isReadOnly?: boolean;
  manualFormula?: string;
  onChange: (gridJson: string, computedTotal: number, formulaText?: string) => void;
  uiColor?: "amber" | "blue" | "emerald";
}

export function MeasurementGrid({ initialData, isReadOnly, manualFormula, onChange, uiColor = "amber" }: MeasurementGridProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [data, setData] = useState<GridData>(() => {
    try {
      if (initialData) return JSON.parse(initialData);
    } catch(e) {}
    return { cols: 5, rows: 6, cells: {}, totalCell: null, useGridTotal: true };
  });

  useEffect(() => {
    // Custom wheel hijack removed to allow native browser scroll behavior
  }, [data.cols, data.rows]);

  const [resizing, setResizing] = useState<{ type: "col" | "row"; index: number; startX: number; startY: number; startSize: number } | null>(null);

  // Pointer move and up listeners for resizing col widths and row heights
  useEffect(() => {
    if (!resizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (resizing.type === "col") {
        const deltaX = e.clientX - resizing.startX;
        const newWidth = Math.max(50, resizing.startSize + deltaX);
        setData(prev => ({
          ...prev,
          colWidths: {
            ...(prev.colWidths || {}),
            [resizing.index]: newWidth
          }
        }));
      } else {
        const deltaY = e.clientY - resizing.startY;
        const newHeight = Math.max(24, resizing.startSize + deltaY);
        setData(prev => ({
          ...prev,
          rowHeights: {
            ...(prev.rowHeights || {}),
            [resizing.index]: newHeight
          }
        }));
      }
    };

    const handlePointerUp = () => {
      setResizing(null);
      // Ensure we trigger the change with the most recent data
      setData(current => {
        setTimeout(() => triggerChange(current), 0);
        return current;
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizing]);

  const getColLabel = (index: number) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B

  // Simple reactive evaluation
  const evaluateCells = (grid: GridData) => {
    const results: Record<string, number | string> = {};
    const evalQueue = Object.keys(grid.cells);
    
    // Helper to evaluate SUM(A1:B3) style
    const expandSumRanges = (expr: string) => {
      return expr.replace(/(SUM|AVERAGE|COUNT|MAX|MIN)\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/gi, (match, func, c1, r1, c2, r2) => {
        const col1 = c1.toUpperCase().charCodeAt(0);
        const col2 = c2.toUpperCase().charCodeAt(0);
        const row1 = parseInt(r1);
        const row2 = parseInt(r2);
        
        const minC = Math.min(col1, col2);
        const maxC = Math.max(col1, col2);
        const minR = Math.min(row1, row2);
        const maxR = Math.max(row1, row2);
        
        const parts = [];
        for(let c = minC; c <= maxC; c++) {
          for(let r = minR; r <= maxR; r++) {
            parts.push(`${String.fromCharCode(c)}${r}`);
          }
        }
        const f = func.toUpperCase();
        if (f === 'SUM') return `(${parts.join('+')})`;
        if (f === 'AVERAGE') return `AVG_FN(${parts.join(',')})`;
        if (f === 'MAX') return `MAX_FN(${parts.join(',')})`;
        if (f === 'MIN') return `MIN_FN(${parts.join(',')})`;
        if (f === 'COUNT') return `COUNT_FN(${parts.join(',')})`;
        return `(${parts.join('+')})`;
      });
    };

    // Calculate in simple sequential order for now 
    let prevUnresolved = -1;
    let iterations = 0;
    while(evalQueue.length > 0 && iterations < 15) {
      iterations++;
      const currentQueue = [...evalQueue];
      for (const cellId of currentQueue) {
        let val = grid.cells[cellId] || "";
        if (val.startsWith("=")) {
          let formula = expandSumRanges(val.substring(1).toUpperCase());
          // Replace references with evaluated sub-results. Ensure non-numeric cell texts evaluate to "0" instead of crashing
          formula = formula.replace(/[A-Z]+[0-9]+/g, (match) => {
            const rawVal = results[match] !== undefined ? results[match] : (grid.cells[match] || "0");
            const strVal = String(rawVal).trim();
            if (strVal.startsWith("=")) return "0";
            const parsedVal = Number(strVal);
            return isNaN(parsedVal) ? "0" : parsedVal.toString();
          });
          
          formula = formula.replace(/MAX_FN\(([^()]*)\)/g, (match, args) => String(Math.max(...(args ? args.split(',').map(Number) : [0]))));
          formula = formula.replace(/MIN_FN\(([^()]*)\)/g, (match, args) => String(Math.min(...(args ? args.split(',').map(Number) : [0]))));
          formula = formula.replace(/AVG_FN\(([^()]*)\)/g, (match, args) => { let a=args?args.split(','):[]; return a.length ? `((${a.join('+')})/${a.length})` : "0"; });
          formula = formula.replace(/COUNT_FN\(([^()]*)\)/g, (match, args) => String(args ? args.split(',').filter((x: string) => Number(x) !== 0).length : 0));
          
          try {
             results[cellId] = evaluateMathExpression(formula);
             evalQueue.splice(evalQueue.indexOf(cellId), 1);
          } catch(e) {
             // Leave for next pass
          }
        } else {
             results[cellId] = val;
             evalQueue.splice(evalQueue.indexOf(cellId), 1);
        }
      }
      if (evalQueue.length === prevUnresolved) {
         // Cycle or unresolvable cells (like list headers or text elements)
         // Fallback evaluate remaining cells gracefully
         for(const remaining of evalQueue) {
            let formula = expandSumRanges((grid.cells[remaining] || "").substring(1).toUpperCase());
            formula = formula.replace(/[A-Z]+[0-9]+/g, (match) => {
               const val = results[match] !== undefined ? results[match] : "0";
               const parsedVal = Number(val);
               return isNaN(parsedVal) ? "0" : parsedVal.toString();
            });
            formula = formula.replace(/MAX_FN\(([^()]*)\)/g, (match, args) => String(Math.max(...(args ? args.split(',').map(Number) : [0]))));
            formula = formula.replace(/MIN_FN\(([^()]*)\)/g, (match, args) => String(Math.min(...(args ? args.split(',').map(Number) : [0]))));
            formula = formula.replace(/AVG_FN\(([^()]*)\)/g, (match, args) => { let a=args?args.split(','):[]; return a.length ? `((${a.join('+')})/${a.length})` : "0"; });
            formula = formula.replace(/COUNT_FN\(([^()]*)\)/g, (match, args) => String(args ? args.split(',').filter((x: string) => Number(x) !== 0).length : 0));

            results[remaining] = evaluateMathExpression(formula);
         }
         break;
      }
      prevUnresolved = evalQueue.length;
    }
    return results;
  };

  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [sumMode, setSumMode] = useState<{ active: boolean; startCell: string | null; endCell: string | null; func?: string }>({ active: false, startCell: null, endCell: null, func: "SUM" });
  const [sigmaMenuOpen, setSigmaMenuOpen] = useState(false);
  const [fillRange, setFillRange] = useState<{ active: boolean, startCell: string | null, currentCell: string | null }>({ active: false, startCell: null, currentCell: null });
  const [selection, setSelection] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [tplMenuOpen, setTplMenuOpen] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const handlePointerUp = () => {
      if (fillRange.active && fillRange.startCell && fillRange.currentCell) {
         // Auto-fill logic
         const matchStart = fillRange.startCell.match(/^([A-Z]+)([0-9]+)$/i);
         const matchEnd = fillRange.currentCell.match(/^([A-Z]+)([0-9]+)$/i);
         
         if (matchStart && matchEnd && selection.start) {
              const startC = matchStart[1].charCodeAt(0);
              const startR = parseInt(matchStart[2]);
              const currC = matchEnd[1].charCodeAt(0);
              const currR = parseInt(matchEnd[2]);
              
              // Find the selection limits to copy from
              let srcMinC = startC, srcMaxC = startC, srcMinR = startR, srcMaxR = startR;
              if (selection.end) {
                  const sMatch1 = selection.start.match(/^([A-Z]+)([0-9]+)$/i);
                  const sMatch2 = selection.end.match(/^([A-Z]+)([0-9]+)$/i);
                  if (sMatch1 && sMatch2) {
                      srcMinC = Math.min(sMatch1[1].charCodeAt(0), sMatch2[1].charCodeAt(0));
                      srcMaxC = Math.max(sMatch1[1].charCodeAt(0), sMatch2[1].charCodeAt(0));
                      srcMinR = Math.min(parseInt(sMatch1[2]), parseInt(sMatch2[2]));
                      srcMaxR = Math.max(parseInt(sMatch1[2]), parseInt(sMatch2[2]));
                  }
              }

              // Target bounds
              const minC = Math.min(startC, currC);
              const maxC = Math.max(startC, currC);
              const minR = Math.min(startR, currR);
              const maxR = Math.max(startR, currR);
              
              const newCells = { ...data.cells };
              const newFormats = { ...(data.cellFormats || {}) };
              let changed = false;

              // Copy the pattern from source range to target range
              for (let c = minC; c <= maxC; c++) {
                 for (let r = minR; r <= maxR; r++) {
                     // Check if it's outside the source range (meaning it is a generated fill cell)
                     if (c >= srcMinC && c <= srcMaxC && r >= srcMinR && r <= srcMaxR) continue;

                     const srcCol = srcMinC + ((c - srcMinC) % (srcMaxC - srcMinC + 1));
                     const srcRow = srcMinR + ((r - srcMinR) % (srcMaxR - srcMinR + 1));
                     
                     const srcId = `${String.fromCharCode(srcCol)}${srcRow}`;
                     const destId = `${String.fromCharCode(c)}${r}`;
                     
                     if (newCells[srcId] !== undefined) {
                         // Extremely basic formula adjustment (just direct copy for now to prevent breaking complex formulas)
                         newCells[destId] = newCells[srcId];
                     } else if (newCells[destId] !== undefined) {
                         delete newCells[destId];
                     }

                     if (newFormats[srcId] !== undefined) {
                         newFormats[destId] = { ...newFormats[srcId] };
                     } else if (newFormats[destId] !== undefined) {
                         delete newFormats[destId];
                     }
                     changed = true;
                 }
              }

              if (changed) {
                  const nd = { ...data, cells: newCells, cellFormats: newFormats };
                  // Increase grid size if we dragged out of bounds
                  let reqCols = data.cols;
                  let reqRows = data.rows;
                  const c1Code = "A".charCodeAt(0);
                  if (maxC - c1Code + 1 > reqCols) reqCols = maxC - c1Code + 1;
                  if (maxR > reqRows) reqRows = maxR;
                  nd.cols = reqCols;
                  nd.rows = reqRows;
                  commitData(nd);
              }
         }
      }
      if (fillRange.active) {
         setFillRange({ active: false, startCell: null, currentCell: null });
      }
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [fillRange, data, selection]);

  const [headerContextMenu, setHeaderContextMenu] = useState<{type: 'col' | 'row', index: number, x: number, y: number} | null>(null);
  const [cellContextMenu, setCellContextMenu] = useState<{cellId: string, x: number, y: number} | null>(null);
  const [draggedItem, setDraggedItem] = useState<{type: 'col' | 'row', index: number} | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{type: 'col' | 'row', index: number} | null>(null);

  const [history, setHistory] = useState<GridData[]>([data]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const commitData = (nd: GridData) => {
    setData(nd);
    triggerChange(nd);
    setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({...nd});
        if (newHistory.length > 50) newHistory.shift();
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
    });
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => {
         const newIdx = prev - 1;
         const prevData = history[newIdx];
         setData(prevData);
         triggerChange(prevData);
         return newIdx;
      });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => {
         const newIdx = prev + 1;
         const nextData = history[newIdx];
         setData(nextData);
         triggerChange(nextData);
         return newIdx;
      });
    }
  };

  const executeCellAction = async (action: 'cut' | 'copy' | 'paste' | 'delete' | 'clear' | 'clear_formats', contextCellId: string) => {
    if (isReadOnly) return;
    setCellContextMenu(null);

    let minC = 999; let maxC = -1;
    let minR = 9999; let maxR = -1;

    let targetRange = { start: contextCellId, end: contextCellId };
    if (selection.start && selection.end) {
       const matchContext = contextCellId.match(/^([A-Z]+)([0-9]+)$/i);
       const match1 = selection.start.match(/^([A-Z]+)([0-9]+)$/i);
       const match2 = selection.end.match(/^([A-Z]+)([0-9]+)$/i);
       if (matchContext && match1 && match2) {
           const cc = matchContext[1].charCodeAt(0);
           const cr = parseInt(matchContext[2]);
           const sc1 = match1[1].charCodeAt(0);
           const sr1 = parseInt(match1[2]);
           const sc2 = match2[1].charCodeAt(0);
           const sr2 = parseInt(match2[2]);
           if (cc >= Math.min(sc1, sc2) && cc <= Math.max(sc1, sc2) && cr >= Math.min(sr1, sr2) && cr <= Math.max(sr1, sr2)) {
               targetRange = selection;
           }
       }
    }

    const m1 = targetRange.start.match(/^([A-Z]+)([0-9]+)$/i);
    const m2 = targetRange.end.match(/^([A-Z]+)([0-9]+)$/i);
    if (!m1 || !m2) return;

    minC = Math.min(m1[1].charCodeAt(0), m2[1].charCodeAt(0));
    maxC = Math.max(m1[1].charCodeAt(0), m2[1].charCodeAt(0));
    minR = Math.min(parseInt(m1[2]), parseInt(m2[2]));
    maxR = Math.max(parseInt(m1[2]), parseInt(m2[2]));

    let newCells = { ...data.cells };
    let newFormats = { ...data.cellFormats };

    if (action === 'clear') {
        let changed = false;
        for (let c = minC; c <= maxC; c++) {
          for (let r = minR; r <= maxR; r++) {
            const id = `${String.fromCharCode(c)}${r}`;
            if (newCells[id] !== undefined && newCells[id] !== "") {
              newCells[id] = "";
              changed = true;
            }
          }
        }
        if (changed) {
           commitData({ ...data, cells: newCells });
        }
    } else if (action === 'delete') {
        let changed = false;
        for (let c = minC; c <= maxC; c++) {
          for (let r = minR; r <= maxR; r++) {
            const id = `${String.fromCharCode(c)}${r}`;
            if (newCells[id] !== undefined) {
              delete newCells[id];
              changed = true;
            }
          }
        }
        if (changed) {
           commitData({ ...data, cells: newCells });
        }
    } else if (action === 'clear_formats') {
        let changed = false;
        for (let c = minC; c <= maxC; c++) {
          for (let r = minR; r <= maxR; r++) {
            const id = `${String.fromCharCode(c)}${r}`;
            if (newFormats[id]) {
              delete newFormats[id];
              changed = true;
            }
          }
        }
        if (changed) {
           commitData({ ...data, cellFormats: newFormats });
        }
    } else if (action === 'copy' || action === 'cut') {
        const matrix = [];
        for (let r = minR; r <= maxR; r++) {
            const row = [];
            for (let c = minC; c <= maxC; c++) {
               const id = `${String.fromCharCode(c)}${r}`;
               row.push(data.cells[id] || "");
               if (action === 'cut') newCells[id] = "";
            }
            matrix.push(row.join("\t"));
        }
        const textToCopy = matrix.join("\n");
        if (navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy);
        }
        if (action === 'cut') {
           commitData({ ...data, cells: newCells });
        }
    } else if (action === 'paste') {
        if (!navigator.clipboard) return;
        try {
            const text = await navigator.clipboard.readText();
            const rows = text.split(/\r?\n/);
            let changed = false;
            for (let r = 0; r < rows.length; r++) {
                if (!rows[r] && r === rows.length - 1) continue; // skip trailing newline
                const cols = rows[r].split("\t");
                for (let c = 0; c < cols.length; c++) {
                    const rTarget = minR + r;
                    const cTarget = minC + c;
                    const idTarget = `${String.fromCharCode(cTarget)}${rTarget}`;
                    if (newCells[idTarget] !== cols[c]) {
                        newCells[idTarget] = cols[c];
                        changed = true;
                    }
                }
            }
            if (changed) {
                let maxRowReq = data.rows;
                let maxColReq = data.cols;
                let c1Code = "A".charCodeAt(0);
                for (const k in newCells) {
                    if (newCells[k]) {
                        const m = k.match(/^([A-Z]+)([0-9]+)$/i);
                        if(m) {
                            maxRowReq = Math.max(maxRowReq, parseInt(m[2]));
                            maxColReq = Math.max(maxColReq, m[1].charCodeAt(0) - c1Code + 1);
                        }
                    }
                }
                commitData({ ...data, cells: newCells, rows: maxRowReq, cols: maxColReq });
            }
        } catch(e) {}
    }
  };

  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (isReadOnly) return;
      
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
         if (focusedCell) return;
         e.preventDefault();
         redo();
         return;
      }
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
         if (focusedCell) return;
         e.preventDefault();
         undo();
         return;
      }
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
         if (focusedCell) return;
         e.preventDefault();
         if (selection.start) executeCellAction('copy', selection.start);
         return;
      }
      if (isCmdOrCtrl && e.key.toLowerCase() === 'x') {
         if (focusedCell) return;
         e.preventDefault();
         if (selection.start) executeCellAction('cut', selection.start);
         return;
      }
      if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
         if (focusedCell) return;
         e.preventDefault();
         if (selection.start) executeCellAction('paste', selection.start);
         return;
      }

      if (!focusedCell && selection.start && e.key.startsWith("Arrow")) {
          e.preventDefault();
          const targetCell = selection.end || selection.start;
          const match = targetCell.match(/^([A-Z]+)([0-9]+)$/i);
          if (match) {
             let c = match[1].charCodeAt(0);
             let r = parseInt(match[2], 10);
             
             if (e.key === "ArrowUp" && r > 1) r--;
             else if (e.key === "ArrowDown" && r < data.rows) r++;
             else if (e.key === "ArrowLeft" && c > 65) c--;
             else if (e.key === "ArrowRight" && c < 65 + data.cols - 1) c++;
             
             const newCell = `${String.fromCharCode(c)}${r}`;
             if (e.shiftKey) {
                 setSelection(s => ({ ...s, end: newCell }));
             } else {
                 setSelection({ start: newCell, end: newCell });
             }
          }
          return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        // If we are actively editing a cell inside an input, don't clear the generic selection
        if (focusedCell) return;
        
        if (selection.start && selection.end) {
          e.preventDefault();
          
          let minC = 999; let maxC = -1;
          let minR = 9999; let maxR = -1;
          
          const getRange = (c1: number, r1: number, c2: number, r2: number) => {
             minC = Math.min(c1, c2); maxC = Math.max(c1, c2);
             minR = Math.min(r1, r2); maxR = Math.max(r1, r2);
          };
          
          const match1 = selection.start.match(/^([A-Z]+)([0-9]+)$/i);
          const match2 = selection.end.match(/^([A-Z]+)([0-9]+)$/i);
          if (match1 && match2) {
             getRange(match1[1].charCodeAt(0), parseInt(match1[2]), match2[1].charCodeAt(0), parseInt(match2[2]));
             
             let newCells = { ...data.cells };
             let changed = false;
             for (let c = minC; c <= maxC; c++) {
               for (let r = minR; r <= maxR; r++) {
                 const id = `${String.fromCharCode(c)}${r}`;
                 if (newCells[id] !== undefined && newCells[id] !== "") {
                   newCells[id] = "";
                   changed = true;
                 }
               }
             }
             if (changed) {
               commitData({ ...data, cells: newCells });
             }
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [selection, focusedCell, data, isReadOnly]);

  const handleDropItem = (targetIndex: number) => {
      if (!draggedItem || isReadOnly) return;
      if (draggedItem.index === targetIndex) return;
      
      const isCol = draggedItem.type === 'col';
      const sourceIndex = draggedItem.index;
      
      const maxCount = isCol ? data.cols : data.rows;
      const order = [];
      for(let i = isCol ? 0 : 1; i < (isCol ? maxCount : maxCount + 1); i++) {
         if (i !== sourceIndex) order.push(i);
      }
      
      let insertAt = isCol ? targetIndex : targetIndex - 1;
      // Adjust insertAt if target is after source
      if (isCol) {
          if (targetIndex > sourceIndex) insertAt = targetIndex;
      } else {
          if (targetIndex > sourceIndex) insertAt = targetIndex - 1;
      }
      
      order.splice(insertAt, 0, sourceIndex);
      
      const oldToNew = new Map();
      order.forEach((oldIdx, newIdx) => {
         oldToNew.set(oldIdx, isCol ? newIdx : newIdx + 1);
      });
      
      const remappedCells: Record<string, string> = {};
      Object.keys(data.cells).forEach(cellId => {
          const colStrMatch = cellId.match(/^[A-Z]+/i);
          const rowStrMatch = cellId.match(/[0-9]+$/);
          if (!colStrMatch || !rowStrMatch) return;
          const colLetter = colStrMatch[0].toUpperCase();
          const rowNum = parseInt(rowStrMatch[0], 10);
          const letterCode = colLetter.charCodeAt(0) - 65;
          
          let newLetterCode = letterCode;
          let newRowNum = rowNum;
          
          if (isCol && oldToNew.has(letterCode)) newLetterCode = oldToNew.get(letterCode);
          if (!isCol && oldToNew.has(rowNum)) newRowNum = oldToNew.get(rowNum);
          
          const newCellId = `${String.fromCharCode(65 + newLetterCode)}${newRowNum}`;
          remappedCells[newCellId] = data.cells[cellId];
      });
      
      let newColWidths = data.colWidths;
      let newRowHeights = data.rowHeights;
      if (isCol && data.colWidths) {
          newColWidths = {};
          Object.keys(data.colWidths).forEach(k => {
             const oldIdx = parseInt(k);
             if (oldToNew.has(oldIdx)) newColWidths![oldToNew.get(oldIdx)] = data.colWidths![oldIdx];
          });
      } else if (!isCol && data.rowHeights) {
          newRowHeights = {};
          Object.keys(data.rowHeights).forEach(k => {
             const oldIdx = parseInt(k);
             if (oldToNew.has(oldIdx)) newRowHeights![oldToNew.get(oldIdx)] = data.rowHeights![oldIdx];
          });
      }

      const nd = { ...data, cells: remappedCells, colWidths: newColWidths, rowHeights: newRowHeights };
      commitData(nd);
  };

  const executeHeaderAction = (action: 'insert_before' | 'insert_after' | 'delete' | 'clear' | 'copy', state: {type: 'col'|'row', index: number}) => {
      if (isReadOnly) return;
      setHeaderContextMenu(null);
      const isCol = state.type === 'col';
      let indices = [state.index];
      
      if (selection.start && selection.end) {
          const match1 = selection.start.match(/^([A-Z]+)([0-9]+)$/i);
          const match2 = selection.end.match(/^([A-Z]+)([0-9]+)$/i);
          if (match1 && match2) {
              const minC = Math.min(match1[1].charCodeAt(0) - 65, match2[1].charCodeAt(0) - 65);
              const maxC = Math.max(match1[1].charCodeAt(0) - 65, match2[1].charCodeAt(0) - 65);
              const minRow = Math.min(parseInt(match1[2]), parseInt(match2[2]));
              const maxRow = Math.max(parseInt(match1[2]), parseInt(match2[2]));
              
              if (isCol) {
                  if (state.index >= minC && state.index <= maxC) {
                      indices = [];
                      for (let i = minC; i <= maxC; i++) indices.push(i);
                  }
              } else {
                  if (state.index >= minRow && state.index <= maxRow) {
                     indices = [];
                     for (let i = minRow; i <= maxRow; i++) indices.push(i);
                  }
              }
          }
      }
      indices.sort((a,b) => a-b);

      const startIndex = indices[0];
      const count = indices.length;

      let newCols = data.cols;
      let newRows = data.rows;
      let remappedCells: Record<string, string> = { ...data.cells };
      let newColWidths = { ...data.colWidths };
      let newRowHeights = { ...data.rowHeights };

      if (action === 'delete') {
          if (isCol && newCols <= count) return;
          if (!isCol && newRows <= count) return;
          
          const tempCells: Record<string, string> = {};
          Object.keys(remappedCells).forEach(cellId => {
              const colStrMatch = cellId.match(/^[A-Z]+/i);
              const rowStrMatch = cellId.match(/[0-9]+$/);
              if (!colStrMatch || !rowStrMatch) return;
              const letterCode = colStrMatch[0].toUpperCase().charCodeAt(0) - 65;
              const rowNum = parseInt(rowStrMatch[0], 10);
              
              const currentIdx = isCol ? letterCode : rowNum;
              if (currentIdx >= startIndex && currentIdx < startIndex + count) return; // Delete it
              
              let newLetterCode = letterCode;
              let newRowNum = rowNum;
              if (isCol && letterCode >= startIndex + count) newLetterCode -= count;
              if (!isCol && rowNum >= startIndex + count) newRowNum -= count;
              
              const newCellId = `${String.fromCharCode(65 + newLetterCode)}${newRowNum}`;
              tempCells[newCellId] = remappedCells[cellId];
          });
          remappedCells = tempCells;
          
          if (isCol) {
              newCols -= count;
              const tempWidths: Record<number, number> = {};
              for(let i=0; i<=newCols + count; i++) {
                 if (i >= startIndex && i < startIndex + count) continue;
                 const srcIdx = i;
                 const destIdx = i >= startIndex + count ? i - count : i;
                 if (newColWidths[srcIdx]) tempWidths[destIdx] = newColWidths[srcIdx];
              }
              newColWidths = tempWidths;
          } else {
              newRows -= count;
              const tempHeights: Record<number, number> = {};
              for(let i=1; i<=newRows + count; i++) {
                  if (i >= startIndex && i < startIndex + count) continue;
                  const srcIdx = i;
                  const destIdx = i >= startIndex + count ? i - count : i;
                  if (newRowHeights[srcIdx]) tempHeights[destIdx] = newRowHeights[srcIdx];
              }
              newRowHeights = tempHeights;
          }
      } else if (action === 'insert_before' || action === 'insert_after' || action === 'copy') {
          const insertIdx = action === 'insert_before' ? startIndex : startIndex + count;
          const tempCells: Record<string, string> = {};
          Object.keys(remappedCells).forEach(cellId => {
              const colStrMatch = cellId.match(/^[A-Z]+/i);
              const rowStrMatch = cellId.match(/[0-9]+$/);
              if (!colStrMatch || !rowStrMatch) return;
              const letterCode = colStrMatch[0].toUpperCase().charCodeAt(0) - 65;
              const rowNum = parseInt(rowStrMatch[0], 10);
              
              let newLetterCode = letterCode;
              let newRowNum = rowNum;
              if (isCol && letterCode >= insertIdx) newLetterCode += count;
              if (!isCol && rowNum >= insertIdx) newRowNum += count;
              
              const newCellId = `${String.fromCharCode(65 + newLetterCode)}${newRowNum}`;
              tempCells[newCellId] = remappedCells[cellId];
              
              // Copy contents if copying
              if (action === 'copy' && (isCol ? (letterCode >= startIndex && letterCode < startIndex + count) : (rowNum >= startIndex && rowNum < startIndex + count))) {
                  const shiftOffset = isCol ? letterCode - startIndex : rowNum - startIndex;
                  const copiedCellId = `${String.fromCharCode(65 + (isCol ? insertIdx + shiftOffset : letterCode))}${isCol ? rowNum : insertIdx + shiftOffset}`;
                  tempCells[copiedCellId] = remappedCells[cellId];
              }
          });
          remappedCells = tempCells;

          if (isCol) {
              newCols += count;
              const tempWidths: Record<number, number> = {};
              for(let i=0; i<newCols; i++) {
                 if (i >= insertIdx && i < insertIdx + count) {
                    if (action === 'copy' && newColWidths[startIndex + (i - insertIdx)]) tempWidths[i] = newColWidths[startIndex + (i - insertIdx)];
                    continue; 
                 }
                 const srcIdx = i >= insertIdx + count ? i - count : i;
                 if (newColWidths[srcIdx]) tempWidths[i] = newColWidths[srcIdx];
              }
              newColWidths = tempWidths;
          } else {
              newRows += count;
              const tempHeights: Record<number, number> = {};
              for(let i=1; i<=newRows; i++) {
                  if (i >= insertIdx && i < insertIdx + count) {
                     if (action === 'copy' && newRowHeights[startIndex + (i - insertIdx)]) tempHeights[i] = newRowHeights[startIndex + (i - insertIdx)];
                     continue;
                  }
                  const srcIdx = i >= insertIdx + count ? i - count : i;
                  if (newRowHeights[srcIdx]) tempHeights[i] = newRowHeights[srcIdx];
              }
              newRowHeights = tempHeights;
          }
      } else if (action === 'clear') {
         Object.keys(remappedCells).forEach(cellId => {
              const colStrMatch = cellId.match(/^[A-Z]+/i);
              const rowStrMatch = cellId.match(/[0-9]+$/);
              if (!colStrMatch || !rowStrMatch) return;
              const letterCode = colStrMatch[0].toUpperCase().charCodeAt(0) - 65;
              const rowNum = parseInt(rowStrMatch[0], 10);
              const currentIdx = isCol ? letterCode : rowNum;
              if (currentIdx >= startIndex && currentIdx < startIndex + count) {
                  delete remappedCells[cellId];
              }
         });
      }

      const nd = { ...data, cols: newCols, rows: newRows, cells: remappedCells, colWidths: newColWidths, rowHeights: newRowHeights };
      commitData(nd);
  };

  const results = evaluateCells(data);

  const handleCellChange = (id: string, value: string) => {
    if (isReadOnly) return;
    const newData = { ...data, cells: { ...data.cells, [id]: value } };
    setData(newData); // intentionally avoiding history record per keystroke
    triggerChange(newData);
  };

  const handleCellBlur = (id: string, value: string) => {
    if (isReadOnly) return;
    const newData = { ...data, cells: { ...data.cells, [id]: value } };
    commitData(newData);
  };

  const addRow = () => {
    if (isReadOnly) return;
    const nd = { ...data, rows: data.rows + 1 };
    commitData(nd);
  };

  const addCol = () => {
    if (isReadOnly) return;
    const nd = { ...data, cols: data.cols + 1 };
    commitData(nd);
  };
  
  const applyFormat = (format: Partial<CellFormat>) => {
    if (isReadOnly) return;
    
    let newFormats = { ...data.cellFormats };
    
    if (selection.start && selection.end && selection.start !== selection.end) {
      // Range selection
      let minC = 999; let maxC = -1;
      let minR = 9999; let maxR = -1;
      const match1 = selection.start.match(/^([A-Z]+)([0-9]+)$/i);
      const match2 = selection.end.match(/^([A-Z]+)([0-9]+)$/i);
      if (match1 && match2) {
        minC = Math.min(match1[1].charCodeAt(0), match2[1].charCodeAt(0));
        maxC = Math.max(match1[1].charCodeAt(0), match2[1].charCodeAt(0));
        minR = Math.min(parseInt(match1[2]), parseInt(match2[2]));
        maxR = Math.max(parseInt(match1[2]), parseInt(match2[2]));
        
        for (let c = minC; c <= maxC; c++) {
          for (let r = minR; r <= maxR; r++) {
            const id = `${String.fromCharCode(c)}${r}`;
            newFormats[id] = { ...(newFormats[id] || {}), ...format };
          }
        }
      }
    } else if (focusedCell) {
       // Single cell focus
       newFormats[focusedCell] = { ...(newFormats[focusedCell] || {}), ...format };
    } else if (selection.start) {
       // Single cell selection
       newFormats[selection.start] = { ...(newFormats[selection.start] || {}), ...format };
    } else {
       return;
    }
    
    const nd = { ...data, cellFormats: newFormats };
    commitData(nd);
  };

  const setTotalCell = (id: string | null) => {
    if (isReadOnly) return;
    const nextTotal = data.totalCell === id ? null : id;
    const nd = { 
      ...data, 
      totalCell: nextTotal, 
      useGridTotal: nextTotal !== null ? true : data.useGridTotal 
    };
    commitData(nd);
  };

  const triggerChange = (nd: GridData) => {
    const computedResults = evaluateCells(nd);
    
    // Check if the user opted to link the cell total, defaults to true
    const activeUseGridTotal = nd.useGridTotal !== false;

    let finalTotalCell = nd.totalCell;
    if (activeUseGridTotal && !finalTotalCell) {
       // Auto-assign to the last cell logical with content
       const cellIdsWithValues = Object.keys(nd.cells).filter(k => (nd.cells[k] || "").trim() !== "");
       if (cellIdsWithValues.length > 0) {
          cellIdsWithValues.sort((a, b) => {
             const rowA = parseInt(a.replace(/^\D+/g, "")) || 0;
             const rowB = parseInt(b.replace(/^\D+/g, "")) || 0;
             if (rowA !== rowB) return rowA - rowB;
             return a.localeCompare(b);
          });
          finalTotalCell = cellIdsWithValues[cellIdsWithValues.length - 1];
       }
    }

    if (activeUseGridTotal && finalTotalCell && !nd.totalCell) {
       nd.totalCell = finalTotalCell;
       setData({ ...nd, totalCell: finalTotalCell });
    }

    let total = 0;
    let activeFormula = "";

    if (activeUseGridTotal && finalTotalCell) {
       const activeTotalCell = finalTotalCell;
       total = activeTotalCell && computedResults[activeTotalCell] !== "ERR" ? Number(computedResults[activeTotalCell]) || 0 : 0;
       
       const cellValue = nd.cells[activeTotalCell] || "";
       if (cellValue.startsWith("=")) {
          activeFormula = cellValue;
       } else if (cellValue.trim() !== "") {
          activeFormula = `=${cellValue}`;
       }
    } else {
       // Disconnected: take from parent manual formula directly
       total = evaluateMathExpression(manualFormula || "");
       activeFormula = manualFormula || "";
    }

    setTimeout(() => {
      onChange(JSON.stringify(nd), total, activeFormula);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    const colStrMatch = id.match(/^[A-Z]+/i);
    const rowStrMatch = id.match(/[0-9]+$/);
    if (!colStrMatch || !rowStrMatch) return;
    const colLetter = colStrMatch[0].toUpperCase();
    const rowNum = parseInt(rowStrMatch[0], 10);
    const letterCode = colLetter.charCodeAt(0);
    const minCode = 65; // A
    const maxCode = 65 + data.cols - 1;

    let nextId: string | null = null;
    let autoAddedRow = false;

    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Enter: Move UP
        if (rowNum > 1) {
          nextId = `${colLetter}${rowNum - 1}`;
        }
      } else {
        // Enter: Move DOWN
        if (rowNum < data.rows) {
          nextId = `${colLetter}${rowNum + 1}`;
        } else if (!isReadOnly) {
          // Dynamic row-insertion on Enter at bottom of grid
          addRow();
          nextId = `${colLetter}${rowNum + 1}`;
          autoAddedRow = true;
        }
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Tab: Move LEFT with row wrap-up
        if (letterCode > minCode) {
          nextId = `${String.fromCharCode(letterCode - 1)}${rowNum}`;
        } else if (rowNum > 1) {
          const prevColLetter = String.fromCharCode(maxCode);
          nextId = `${prevColLetter}${rowNum - 1}`;
        }
      } else {
        // Tab: Move RIGHT with row wrap-down
        if (letterCode < maxCode) {
          nextId = `${String.fromCharCode(letterCode + 1)}${rowNum}`;
        } else {
          // Wrap to first column (column A) of next row
          if (rowNum < data.rows) {
            nextId = `A${rowNum + 1}`;
          } else if (!isReadOnly) {
            // Last cell of spreadsheet: append a new row and focus A
            addRow();
            nextId = `A${rowNum + 1}`;
            autoAddedRow = true;
          }
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rowNum < data.rows) {
        nextId = `${colLetter}${rowNum + 1}`;
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowNum > 1) {
        nextId = `${colLetter}${rowNum - 1}`;
      }
    } else if (e.key === "ArrowLeft") {
      const target = e.target as HTMLInputElement;
      if (target.selectionStart === 0) {
          e.preventDefault();
          if (letterCode > minCode) {
            nextId = `${String.fromCharCode(letterCode - 1)}${rowNum}`;
          }
      }
    } else if (e.key === "ArrowRight") {
      const target = e.target as HTMLInputElement;
      if (target.selectionStart === target.value.length) {
          e.preventDefault();
          if (letterCode < maxCode) {
            nextId = `${String.fromCharCode(letterCode + 1)}${rowNum}`;
          }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      target.blur();
      setFocusedCell(null);
    }

    if (nextId) {
       // Gentle delay to allow state changes to update DOM, especially when appending new rows
       setTimeout(() => {
          const targetEl = inputRefs.current[nextId!];
          if (targetEl) {
             targetEl.focus();
             // Standard spreadsheet behavior: Select all text on navigation
             targetEl.select();
          }
       }, autoAddedRow ? 85 : 25);
    }
  };

  const finishSumMode = () => {
     if (sumMode.active && sumMode.startCell && focusedCell) {
         const range = sumMode.endCell ? `${sumMode.startCell}:${sumMode.endCell}` : `${sumMode.startCell}:${sumMode.startCell}`;
         const currentVal = data.cells[focusedCell] || "";
         const fn = sumMode.func || "SUM";
         const formulaToPos = `${fn}(${range})`;
         let newVal = "";
         if (currentVal.startsWith("=")) {
            newVal = currentVal.trim() === "=" ? `=${formulaToPos}` : `${currentVal}+${formulaToPos}`;
         } else if (currentVal.trim() !== "") {
            newVal = `=${currentVal}+${formulaToPos}`;
         } else {
            newVal = `=${formulaToPos}`;
         }
             
         handleCellChange(focusedCell, newVal);
         setSumMode({ active: false, startCell: null, endCell: null, func: "SUM" });
         if (inputRefs.current[focusedCell]) {
             inputRefs.current[focusedCell]?.focus();
         }
     } else {
         setSumMode({ active: false, startCell: null, endCell: null, func: "SUM" });
     }
  };

  const loadTemplate = (type: "generico" | "3d" | "2d" | "simple" | "clear") => {
     if (isReadOnly) return;
     setTplMenuOpen(false);
     let nd: GridData;
     if (type === "generico") {
        nd = {
           cols: 8,
           rows: 7,
           useGridTotal: true,
           totalCell: "G7",
           colWidths: { 0: 55, 1: 185, 2: 55, 3: 75, 4: 75, 5: 75, 6: 95, 7: 55 },
           rowHeights: {},
           cells: {
              "A1": "Ítem", "B1": "Descripción / Eje de Medida", "C1": "Veces", "D1": "Largo (m)", "E1": "Ancho (m)", "F1": "Alto (m)", "G1": "Parcial (m³)", "H1": "Unid.",
              "A2": "01.01", "B2": "Excavación de Zanjas Eje A-A", "C2": "2", "D2": "5.40", "E2": "0.60", "F2": "0.80", "G2": "=C2*D2*E2*F2", "H2": "m³",
              "A3": "01.02", "B3": "Cimiento Corrido Mezcla 1:10", "C3": "1", "D3": "8.20", "E3": "0.40", "F3": "0.75", "G3": "=C3*D3*E3*F3", "H3": "m³",
              "A4": "02.01", "B4": "Encofrado de Sobrecimiento", "C4": "2", "D4": "6.00", "E4": "1.00", "F4": "0.30", "G4": "=C4*D4*E4*F4", "H4": "m²",
              "A5": "02.02", "B5": "Sobre-cimiento Concreto f'c=175", "C5": "1", "D5": "12.00", "E5": "0.15", "F5": "0.30", "G5": "=C5*D5*E5*F5", "H5": "m³",
              "A6": "03.01", "B6": "Acero de Refuerzo en Columnas de Concreto", "C6": "4", "D6": "4.20", "E6": "1.00", "F6": "0.99", "G6": "=C6*D6*E6*F6", "H6": "kg",
              "A7": "SUMATORIA", "B7": "SUMA ACUMULADA TOTAL METRADOS", "F7": "Total:", "G7": "=SUM(G2:G6)"
           }
        };
     } else if (type === "3d") {
        nd = {
           cols: 6,
           rows: 7,
           useGridTotal: true,
           totalCell: "F7",
           colWidths: { 0: 170, 1: 55, 2: 75, 3: 75, 4: 75, 5: 95 },
           rowHeights: {},
           cells: {
              "A1": "Descripción / Eje", "B1": "Veces", "C1": "Largo (m)", "D1": "Ancho (m)", "E1": "Alto (m)", "F1": "Parcial (m³)",
              "A2": "Cimientos Corridos Eje A-A", "B2": "2", "C2": "6.00", "D2": "0.40", "E2": "0.80", "F2": "=B2*C2*D2*E2",
              "A3": "Cimientos Corridos Eje B-B", "B3": "1", "C3": "4.50", "D3": "0.40", "E3": "0.80", "F3": "=B3*C3*D3*E3",
              "A4": "Sobre-cimientos Eje 1-1", "B4": "1", "C4": "3.20", "D4": "0.15", "E4": "0.30", "F4": "=B4*C4*D4*E4",
              "A5": "Zapata Z-1 Estructural", "B5": "4", "C5": "1.00", "D5": "1.00", "E5": "0.50", "F5": "=B5*C5*D5*E5",
              "A6": "Solado de Concreto Mezcla", "B6": "2", "C6": "1.20", "D6": "1.20", "E6": "0.10", "F6": "=B6*C6*D6*E6",
              "A7": "SUMA TOTAL METRADO (3D)", "E7": "Total:", "F7": "=SUM(F2:F6)"
           }
        };
     } else if (type === "2d") {
        nd = {
           cols: 5,
           rows: 7,
           useGridTotal: true,
           totalCell: "E7",
           colWidths: { 0: 170, 1: 55, 2: 80, 3: 80, 4: 100 },
           rowHeights: {},
           cells: {
              "A1": "Descripción / Eje", "B1": "Veces", "C1": "Largo (m)", "D1": "Ancho (m)", "E1": "Parcial (m²)",
              "A2": "Muro de Ladrillo S-1", "B2": "2", "C2": "4.20", "D2": "2.60", "E2": "=B2*C2*D2",
              "A3": "Tarrajeo de Muros Interiores", "B3": "1", "C3": "12.50", "D3": "2.60", "E3": "=B3*C3*D3",
              "A4": "Contrapiso M-1 f'c=140", "B4": "1", "C4": "5.40", "D4": "3.80", "E4": "=B4*C4*D4",
              "A5": "Piso Porcelanato Pulido", "B5": "1", "C5": "4.00", "D5": "3.50", "E5": "=B5*C5*D5",
              "A6": "Enchape Cerámico Baño", "B6": "1", "C6": "2.40", "D6": "1.80", "E6": "=B6*C6*D6",
              "A7": "SUMA TOTAL METRADO (2D)", "D7": "Total:", "E7": "=SUM(E2:E6)"
           }
        };
     } else if (type === "simple") {
        nd = {
           cols: 3,
           rows: 7,
           useGridTotal: true,
           totalCell: "B7",
           colWidths: { 0: 215, 1: 110, 2: 160 },
           rowHeights: {},
           cells: {
              "A1": "Descripción de Partida", "B1": "Metraje / Unidad", "C1": "Observaciones / Notas",
              "A2": "Excavación manual de zanjas", "B2": "15.40", "C2": "Terreno semiduro arcilloso",
              "A3": "Refine y nivelación de zanjas", "B3": "8.20", "C3": "Eje principal colindante",
              "A4": "Cama de apoyo e=10cm arena", "B4": "12.00", "C4": "Arena gruesa de cantera",
              "A5": "Relleno compactado con equipo", "B5": "9.50", "C5": "Con vibradora manual",
              "A6": "Eliminación de desmonte c/volquete", "B6": "18.30", "C6": "Tierra suelta + esponjamiento",
              "A7": "SUMATORIA METRADO", "B7": "=SUM(B2:B6)", "C7": "Subtotal de partida"
           }
        };
     } else {
        nd = {
           cols: 5,
           rows: 6,
           useGridTotal: true,
           totalCell: null,
           colWidths: { 0: 160, 1: 65, 2: 80, 3: 80, 4: 90 },
           rowHeights: {},
           cells: {}
        };
     }
     commitData(nd);
  };

  const renderGrid = () => {
    // Corner header is 40px width
    const headers = [<th key="corner" className="bg-slate-100 border-b border-r border-slate-300 select-none relative" style={{ width: "40px" }}></th>];
    for(let c=0; c<data.cols; c++) {
      const w = (data.colWidths && data.colWidths[c]) || 95;
      headers.push(
        <th 
          key={`h-${c}`} 
          style={isReadOnly ? { width: `${w}px`, minWidth: '50px' } : { width: `${w}px` }}
          onMouseDown={(e) => {
             if (isReadOnly) return;
             if (e.button === 0 && !resizing) {
                 setSelection({ start: `${getColLabel(c)}1`, end: `${getColLabel(c)}${data.rows}` });
                 setFocusedCell(null);
             }
          }}
          onMouseEnter={(e) => {
             if (isReadOnly || resizing) return;
             if (e.buttons === 1 && selection.start) {
                 setSelection(s => {
                    const matchStart = s.start?.match(/^([A-Z]+)([0-9]+)$/i);
                    if (matchStart && matchStart[2] === '1') {
                         return { start: s.start, end: `${getColLabel(c)}${data.rows}` };
                    }
                    return s;
                 });
             }
          }}
          onContextMenu={(e) => {
             e.preventDefault();
             if (isReadOnly) return;
             const rect = e.currentTarget.getBoundingClientRect();
             setHeaderContextMenu({type: 'col', index: c, x: e.clientX, y: rect.bottom });
          }}
          className={`p-1.5 px-2 text-center text-[10px] font-black text-slate-500 bg-slate-100 border-b border-r border-slate-300 font-mono relative select-none group transition-colors ${isReadOnly ? 'cursor-default' : 'hover:bg-slate-200 cursor-cell'} ${!isReadOnly && dragOverItem?.type === 'col' && dragOverItem.index === c ? 'bg-amber-100 border-b-amber-500 border-b-2' : ''}`}
        >
          {getColLabel(c)}
          {/* Drag Resizer for column width */}
          {!isReadOnly && (
            <div 
              onPointerDown={(e) => {
                e.preventDefault();
                setResizing({
                  type: "col",
                  index: c,
                  startX: e.clientX,
                  startY: e.clientY,
                  startSize: w
                });
              }}
              style={{ cursor: "col-resize" }}
              className="absolute top-0 right-0 h-full w-2 hover:bg-amber-500/50 active:bg-amber-600/90 transition-colors z-40 touch-none"
              title="Arrastrar ajuste de ancho"
            />
          )}
        </th>
      );
    }
    
    // Formula Reference Resolution
    const focusedVal = focusedCell ? (data.cells[focusedCell] || "") : "";
    const isEditingFormula = focusedVal.startsWith("=");
    let activeRefs: string[] = [];
    if (isEditingFormula) {
       let expanded = focusedVal.substring(1).toUpperCase();
       expanded = expanded.replace(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/gi, (match, c1, r1, c2, r2) => {
            const col1 = c1.toUpperCase().charCodeAt(0);
            const col2 = c2.toUpperCase().charCodeAt(0);
            const row1 = parseInt(r1);
            const row2 = parseInt(r2);
            const minC = Math.min(col1, col2);
            const maxC = Math.max(col1, col2);
            const minR = Math.min(row1, row2);
            const maxR = Math.max(row1, row2);
            const parts = [];
            for(let c = minC; c <= maxC; c++) {
              for(let r = minR; r <= maxR; r++) {
                parts.push(`${String.fromCharCode(c)}${r}`);
              }
            }
            return `(${parts.join('+')})`;
       });
       activeRefs = Array.from(new Set(expanded.match(/[A-Z]+\d+/g) || []));
    }

    const refColorClasses = [
        "ring-inset ring-2 ring-blue-500 bg-blue-50/30",
        "ring-inset ring-2 ring-red-500 bg-red-50/30",
        "ring-inset ring-2 ring-purple-500 bg-purple-50/30",
        "ring-inset ring-2 ring-orange-500 bg-orange-50/30",
        "ring-inset ring-2 ring-teal-500 bg-teal-50/30"
    ];

    const rows = [];
    for(let r=1; r<=data.rows; r++) {
      const h = (data.rowHeights && data.rowHeights[r]) || 34;
      const cells = [
        <td 
          key={`rh-${r}`} 
          onMouseDown={(e) => {
             if (isReadOnly) return;
             if (e.button === 0 && !resizing) {
                 setSelection({ start: `A${r}`, end: `${getColLabel(data.cols - 1)}${r}` });
                 setFocusedCell(null);
             }
          }}
          onMouseEnter={(e) => {
             if (isReadOnly || resizing) return;
             if (e.buttons === 1 && selection.start) {
                 setSelection(s => {
                    const matchStart = s.start?.match(/^([A-Z]+)([0-9]+)$/i);
                    // if it was a row selection, the start is likely col A.
                    if (matchStart && matchStart[1] === 'A') {
                         return { start: s.start, end: `${getColLabel(data.cols - 1)}${r}` };
                    }
                    return s;
                 });
             }
          }}
          onContextMenu={(e) => {
             e.preventDefault();
             if (isReadOnly) return;
             const rect = e.currentTarget.getBoundingClientRect();
             setHeaderContextMenu({type: 'row', index: r, x: rect.right, y: e.clientY });
          }}
          className={`p-1 px-2 text-center text-[10px] font-bold text-slate-500 bg-slate-100 border-b border-r border-slate-300 font-mono relative select-none transition-colors ${isReadOnly ? 'cursor-default' : 'hover:bg-slate-200 cursor-cell'} ${!isReadOnly && dragOverItem?.type === 'row' && dragOverItem.index === r ? 'bg-amber-100 border-r-amber-500 border-r-2' : ''}`}
        >
          {r}
          {/* Drag Resizer for row height */}
          {!isReadOnly && (
            <div 
              onPointerDown={(e) => {
                e.preventDefault();
                setResizing({
                  type: "row",
                  index: r,
                  startX: e.clientX,
                  startY: e.clientY,
                  startSize: h
                });
              }}
              style={{ cursor: "row-resize" }}
              className="absolute bottom-0 left-0 w-full h-1.5 hover:bg-amber-500/50 active:bg-amber-600/90 transition-colors z-45 touch-none"
              title="Arrastrar ajuste de alto"
            />
          )}
        </td>
      ];
      for(let c=0; c<data.cols; c++) {
        const cellId = `${getColLabel(c)}${r}`;
        const activeUseGridTotal = data.useGridTotal !== false;
        const isOptedAsTotal = activeUseGridTotal && (data.totalCell === cellId);
        const val = data.cells[cellId] || "";
        const evaluated = results[cellId];
        const isFormula = val.startsWith('=');
        // Alignment: values starting with '=' or perfectly numeric are aligned right, standard text stays aligned left
        const isNumeric = val.startsWith('=') || (val.trim() !== "" && !isNaN(Number(val)));
        
        let customRefClass = "";
        if (isEditingFormula && focusedCell !== cellId) {
            const refIndex = activeRefs.indexOf(cellId);
            if (refIndex !== -1) {
                customRefClass = refColorClasses[refIndex % refColorClasses.length];
            }
        }

        // Sum mode selection styling
        let isSumHighlighted = false;
        if (!isReadOnly && sumMode.active && sumMode.startCell) {
            if (sumMode.startCell === cellId) isSumHighlighted = true;
            else if (sumMode.endCell) {
                // simple rect check
                const match1 = sumMode.startCell.match(/^([A-Z]+)([0-9]+)$/i);
                const match2 = sumMode.endCell.match(/^([A-Z]+)([0-9]+)$/i);
                const match3 = cellId.match(/^([A-Z]+)([0-9]+)$/i);
                if (match1 && match2 && match3) {
                    const c1 = match1[1].charCodeAt(0);
                    const r1 = parseInt(match1[2]);
                    const c2 = match2[1].charCodeAt(0);
                    const r2 = parseInt(match2[2]);
                    const c3 = match3[1].charCodeAt(0);
                    const r3 = parseInt(match3[2]);
                    if (c3 >= Math.min(c1, c2) && c3 <= Math.max(c1, c2) && r3 >= Math.min(r1, r2) && r3 <= Math.max(r1, r2)) {
                        isSumHighlighted = true;
                    }
                }
            }
        }

        // Selection styling
        let isSelectionHighlighted = false;
        let isFillEndCell = false;
        let isFillTargetHighlighted = false;
        if (!isReadOnly && !sumMode.active && selection.start) {
            const match1 = selection.start.match(/^([A-Z]+)([0-9]+)$/i);
            const match2 = (selection.end || selection.start).match(/^([A-Z]+)([0-9]+)$/i);
            const match3 = cellId.match(/^([A-Z]+)([0-9]+)$/i);
            if (match1 && match2 && match3) {
                const c1 = match1[1].charCodeAt(0);
                const r1 = parseInt(match1[2]);
                const c2 = match2[1].charCodeAt(0);
                const r2 = parseInt(match2[2]);
                const c3 = match3[1].charCodeAt(0);
                const r3 = parseInt(match3[2]);
                if (c3 >= Math.min(c1, c2) && c3 <= Math.max(c1, c2) && r3 >= Math.min(r1, r2) && r3 <= Math.max(r1, r2)) {
                    isSelectionHighlighted = true;
                }
                if (c3 === Math.max(c1, c2) && r3 === Math.max(r1, r2)) {
                    isFillEndCell = true;
                }
                
                if (fillRange.active && fillRange.startCell && fillRange.currentCell) {
                    const mFillS = fillRange.startCell.match(/^([A-Z]+)([0-9]+)$/i);
                    const mFillC = fillRange.currentCell.match(/^([A-Z]+)([0-9]+)$/i);
                    if (mFillS && mFillC) {
                        const fsC = mFillS[1].charCodeAt(0);
                        const fsR = parseInt(mFillS[2]);
                        const fcC = mFillC[1].charCodeAt(0);
                        const fcR = parseInt(mFillC[2]);
                        if (c3 >= Math.min(fsC, fcC) && c3 <= Math.max(fsC, fcC) && r3 >= Math.min(fsR, fcR) && r3 <= Math.max(fsR, fcR)) {
                            if (!isSelectionHighlighted) isFillTargetHighlighted = true;
                        }
                    }
                }
            }
        }
        
        const cellFormat = data.cellFormats ? data.cellFormats[cellId] : undefined;
        let tdBgClass = 'bg-white';
        if (isOptedAsTotal) tdBgClass = 'bg-emerald-50 border-emerald-300 ring-inset ring-2 ring-emerald-500/40';
        
        let customTdStyle: React.CSSProperties | undefined = undefined;
        if (cellFormat?.bg) {
          customTdStyle = { backgroundColor: cellFormat.bg };
        }

        cells.push(
          <td 
             key={cellId} 
             style={customTdStyle}
             className={`border-b border-r border-slate-200 relative group p-0 ${!isReadOnly && focusedCell === cellId ? 'ring-inset ring-2 ring-amber-400/75 z-20 print:ring-0' : ''} ${tdBgClass} ${isSumHighlighted ? 'ring-inset ring-2 ring-blue-500/50 bg-blue-50/50 print:ring-0' : ''} ${isSelectionHighlighted && focusedCell !== cellId ? 'mix-blend-multiply ring-inset ring-2 ring-blue-500/20 print:ring-0' : ''} ${isFillTargetHighlighted ? 'mix-blend-multiply bg-amber-500/10 ring-inset ring-2 ring-amber-500/40 border-amber-500 border-dashed print:ring-0' : ''} ${customRefClass} print:bg-white`}
             onContextMenu={(e) => {
                 e.preventDefault();
                 if (isReadOnly) return;
                 setCellContextMenu({ cellId, x: e.clientX, y: e.clientY });
             }}
             onMouseDown={(e) => {
                 if (isReadOnly) return;
                 if (sumMode.active) {
                     e.preventDefault(); // Don't steal focus
                     if (!sumMode.startCell) {
                         setSumMode({ ...sumMode, startCell: cellId, endCell: null });
                     } else {
                         setSumMode({ ...sumMode, endCell: cellId });
                     }
                 } else if (focusedCell && focusedCell !== cellId) {
                     const activeValue = data.cells[focusedCell] || "";
                     const currentRef = inputRefs.current[focusedCell];
                     const cursorPosition = currentRef ? (currentRef.selectionStart || activeValue.length) : activeValue.length;
                     const leftPart = activeValue.slice(0, cursorPosition);
                     
                     // Solo vincular celda si acabamos de tipear un operador o =
                     if (activeValue.startsWith("=") && /[=+\-*/(]$/.test(leftPart.trim())) {
                         e.preventDefault(); // keep focus on the formula input
                         if (currentRef) {
                             const newValue = leftPart + cellId + activeValue.slice(cursorPosition);
                             handleCellChange(focusedCell, newValue);
                             setTimeout(() => {
                                 currentRef.focus();
                                 currentRef.setSelectionRange(cursorPosition + cellId.length, cursorPosition + cellId.length);
                             }, 0);
                         }
                     } else {
                         if (e.shiftKey) {
                             e.preventDefault();
                             setSelection(s => ({ ...s, end: cellId }));
                             setFocusedCell(null);
                         } else {
                             setSelection({ start: cellId, end: cellId });
                             const targetRef = inputRefs.current[cellId];
                             if (targetRef) setTimeout(() => targetRef.focus(), 0);
                         }
                     }
                 } else {
                     if (e.shiftKey && selection.start) {
                         e.preventDefault();
                         setSelection(s => ({ ...s, end: cellId }));
                         setFocusedCell(null);
                     } else {
                         setSelection({ start: cellId, end: cellId });
                         const targetRef = inputRefs.current[cellId];
                         if (targetRef) setTimeout(() => targetRef.focus(), 0);
                     }
                 }
             }}
             onMouseEnter={(e) => {
                 if (isReadOnly) return;
                 if (fillRange.active) {
                     setFillRange(prev => ({...prev, currentCell: cellId}));
                     return;
                 }
                 if (e.buttons === 1 && !sumMode.active && selection.start && focusedCell === null) {
                     setSelection(s => ({ ...s, end: cellId }));
                 }
             }}
          >
             {isReadOnly ? (
               <span 
                 className={`block w-full h-full py-1.5 px-2 text-xs select-none break-words ${cellFormat?.align === 'center' ? 'text-center' : cellFormat?.align === 'right' ? 'text-right' : cellFormat?.align === 'left' ? 'text-left' : (isNumeric || (isFormula && evaluated !== "ERR") ? 'text-right font-mono' : 'text-left')} ${isOptedAsTotal ? 'text-emerald-950 font-bold' : ''}`}
                 style={{
                   color: cellFormat?.color,
                   fontWeight: cellFormat?.bold ? 'bold' : undefined,
                   fontStyle: cellFormat?.italic ? 'italic' : undefined,
                 }}
               >
                 {isFormula ? (evaluated === "ERR" ? "ERR" : formatNumberStr(evaluated, true, cellFormat)) : formatNumberStr(val, isNumeric, cellFormat)}
               </span>
             ) : (
              <>
                <input 
                  ref={(el) => inputRefs.current[cellId] = el}
                  type="text"
                  value={focusedCell === cellId ? val : (isFormula && evaluated !== "ERR" && evaluated !== undefined ? String(formatNumberStr(evaluated, true, cellFormat)) : String(formatNumberStr(val, isNumeric, cellFormat)))}
                  onChange={(e) => handleCellChange(cellId, e.target.value)}
                  disabled={isReadOnly}
                  onFocus={() => { setFocusedCell(cellId); }}
                  onKeyDown={(e) => handleKeyDown(e, cellId)}
                  enterKeyHint="next"
                  placeholder={isFormula && evaluated !== "ERR" ? String(formatNumberStr(evaluated, true, cellFormat)) : undefined}
                  className={`w-full h-full py-1.5 focus:outline-hidden text-xs bg-transparent ${(val || isOptedAsTotal) ? 'pl-5' : 'pl-1.5'} pr-1.5 ${cellFormat?.align === 'center' ? 'text-center' : cellFormat?.align === 'right' ? 'text-right' : cellFormat?.align === 'left' ? 'text-left' : (isNumeric || (isFormula && evaluated !== "ERR") ? 'text-right font-mono' : 'text-left')} ${isOptedAsTotal ? 'text-emerald-950 font-bold' : ''} ${!isOptedAsTotal && !cellFormat?.color ? 'text-slate-800' : ''} print:hidden`}
                  style={{
                    color: cellFormat?.color,
                    fontWeight: cellFormat?.bold ? 'bold' : undefined,
                    fontStyle: cellFormat?.italic ? 'italic' : undefined,
                    backgroundColor: isSelectionHighlighted && focusedCell !== cellId && !cellFormat?.bg ? 'rgba(219, 234, 254, 0.4)' : (focusedCell === cellId && !cellFormat?.bg ? 'rgba(254, 243, 199, 0.1)' : undefined)
                  }}
                  title={isFormula ? `Res: ${formatNumberStr(evaluated, true, cellFormat)}` : val}
                />
                <span 
                  className={`hidden print:block w-full h-full py-1 px-1.5 text-xs select-none break-words ${cellFormat?.align === 'center' ? 'text-center' : cellFormat?.align === 'right' ? 'text-right' : cellFormat?.align === 'left' ? 'text-left' : (isNumeric || (isFormula && evaluated !== "ERR") ? 'text-right font-mono' : 'text-left')} ${isOptedAsTotal ? 'text-emerald-950 font-bold' : ''}`}
                  style={{
                    color: cellFormat?.color,
                    fontWeight: cellFormat?.bold ? 'bold' : undefined,
                    fontStyle: cellFormat?.italic ? 'italic' : undefined,
                  }}
                >
                  {isFormula ? (evaluated === "ERR" ? "ERR" : formatNumberStr(evaluated, true, cellFormat)) : formatNumberStr(val, isNumeric, cellFormat)}
                </span>
              </>
             )}
            {isFormula && focusedCell === cellId && (
              <div className="absolute right-1 bottom-0.5 text-[8px] text-emerald-600 font-bold pointer-events-none opacity-40">
                Res: {formatNumberStr(evaluated, true, cellFormat)}
              </div>
            )}
            {!isReadOnly && (val || isOptedAsTotal) && (
              <button 
                title={isOptedAsTotal ? "Desenlazar este resultado" : "Vincular celda como resultado (Total)"}
                onClick={(e) => {
                   e.stopPropagation();
                   setTotalCell(cellId);
                }}
                className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded flex items-center justify-center transition-opacity z-10 ${isOptedAsTotal ? 'opacity-100 bg-emerald-500 text-white shadow-xs' : 'opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 text-slate-600'}`}
              >
                <CheckCircle2 size={10} />
              </button>
            )}
            {isFillEndCell && !isReadOnly && !sumMode.active && (
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-500 border border-white cursor-crosshair z-30 touch-none print:hidden"
                onPointerDown={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   setFillRange({ active: true, startCell: cellId, currentCell: cellId });
                }}
              />
            )}
          </td>
        );
      }
      rows.push(
        <tr 
          key={`row-${r}`} 
          style={isReadOnly ? undefined : { height: `${h}px` }}
          className="hover:bg-slate-50/40 transition-colors"
        >
          {cells}
        </tr>
      );
    }

    return (
      <div 
        ref={gridContainerRef}
        className="flex-1 overflow-auto w-full min-h-0 pb-2 overscroll-contain"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <table className={`w-full border-collapse border border-slate-300 bg-slate-50 min-w-max ${isReadOnly ? 'table-auto' : 'table-fixed relative'}`}>
          <thead><tr>{headers}</tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  };

  const containerContent = isReadOnly ? (
    <div 
      className="w-full h-full flex flex-col min-h-0"
    >
      {renderGrid()}
    </div>
  ) : (
    <div className={`flex flex-col flex-1 min-h-0 w-full h-full ${isFullscreen ? 'bg-slate-50 p-6 max-md:p-2' : ''}`}>
       {/* Context Menu for Row/Col Headers */}
       {headerContextMenu && !isReadOnly && (() => {
           let headerMenuCount = 1;
           let headerMenuStartLabel = headerContextMenu.type === 'col' ? getColLabel(headerContextMenu.index) : headerContextMenu.index;
           let headerMenuEndLabel = "";
           
           if (selection.start && selection.end) {
               const match1 = selection.start.match(/^([A-Z]+)([0-9]+)$/i);
               const match2 = selection.end.match(/^([A-Z]+)([0-9]+)$/i);
               if (match1 && match2) {
                   if (headerContextMenu.type === 'col') {
                       const minC = Math.min(match1[1].charCodeAt(0) - 65, match2[1].charCodeAt(0) - 65);
                       const maxC = Math.max(match1[1].charCodeAt(0) - 65, match2[1].charCodeAt(0) - 65);
                       if (headerContextMenu.index >= minC && headerContextMenu.index <= maxC) {
                           headerMenuCount = maxC - minC + 1;
                           if (headerMenuCount > 1) {
                               headerMenuStartLabel = getColLabel(minC);
                               headerMenuEndLabel = getColLabel(maxC);
                           }
                       }
                   } else {
                       const minR = Math.min(parseInt(match1[2]), parseInt(match2[2]));
                       const maxR = Math.max(parseInt(match1[2]), parseInt(match2[2]));
                       if (headerContextMenu.index >= minR && headerContextMenu.index <= maxR) {
                           headerMenuCount = maxR - minR + 1;
                           if (headerMenuCount > 1) {
                               headerMenuStartLabel = minR.toString();
                               headerMenuEndLabel = maxR.toString();
                           }
                       }
                   }
               }
           }
           
           const colRawType = headerContextMenu.type === 'col' ? 'Col' : 'Fila';
           const typeStr = headerContextMenu.type === 'col' ? (headerMenuCount > 1 ? 'Columnas' : 'Columna') : (headerMenuCount > 1 ? 'Filas' : 'Fila');
           const identifierStr = headerMenuCount > 1 ? `${headerMenuStartLabel} - ${headerMenuEndLabel}` : headerMenuStartLabel;

           return (
            <>
               <div className="fixed inset-0 z-[110]" onClick={() => setHeaderContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setHeaderContextMenu(null); }}></div>
               <div 
                  className="fixed z-[120] bg-white border border-slate-200 rounded-lg shadow-xl w-48 py-1 overflow-hidden animate-fade-in"
                  style={{ left: Math.min(headerContextMenu.x, window.innerWidth - 192), top: Math.min(headerContextMenu.y, window.innerHeight - 200) }}
               >
                   <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 border-b border-slate-100 uppercase tracking-widest mb-1">
                       {typeStr} {identifierStr}
                   </div>
                   <button onClick={() => executeHeaderAction('copy', headerContextMenu)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center justify-between">
                      Duplicar {headerMenuCount > 1 ? headerMenuCount + ' ' + (headerContextMenu.type === 'col' ? 'Cols' : 'Filas') : colRawType}
                   </button>
                   <button onClick={() => executeHeaderAction('insert_before', headerContextMenu)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                      Insertar {headerMenuCount} Antes
                   </button>
                   <button onClick={() => executeHeaderAction('insert_after', headerContextMenu)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                      Insertar {headerMenuCount} Después
                   </button>
                   <div className="h-px bg-slate-100 my-1"></div>
                   <button onClick={() => executeHeaderAction('clear', headerContextMenu)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                      Limpiar contenido
                   </button>
                    <button onClick={() => executeHeaderAction('delete', headerContextMenu)} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center justify-between">
                      Eliminar {headerMenuCount > 1 ? typeStr : colRawType}
                   </button>
               </div>
            </>
           );
       })()}

       {/* Context Menu for Cells */}
       {cellContextMenu && !isReadOnly && (
           <>
              <div className="fixed inset-0 z-[110]" onClick={() => setCellContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCellContextMenu(null); }}></div>
              <div 
                 className="fixed z-[120] bg-white border border-slate-200 rounded-lg shadow-xl w-48 py-1 overflow-hidden animate-fade-in"
                 style={{ left: Math.min(cellContextMenu.x, window.innerWidth - 192), top: Math.min(cellContextMenu.y, window.innerHeight - 200) }}
              >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 border-b border-slate-100 uppercase tracking-widest mb-1">
                      CELDA {cellContextMenu.cellId}
                  </div>
                  <button onClick={() => executeCellAction('cut', cellContextMenu.cellId)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center justify-between">
                     Cortar (Ctrl+X)
                  </button>
                  <button onClick={() => executeCellAction('copy', cellContextMenu.cellId)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                     Copiar (Ctrl+C)
                  </button>
                  <button onClick={() => executeCellAction('paste', cellContextMenu.cellId)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                     Pegar (Ctrl+V)
                  </button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button onClick={() => executeHeaderAction('insert_before', {type: 'row', index: parseInt(cellContextMenu.cellId.replace(/\D/g, ''))})} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                     Insertar Fila Arriba
                  </button>
                  <button onClick={() => executeHeaderAction('insert_after', {type: 'row', index: parseInt(cellContextMenu.cellId.replace(/\D/g, ''))})} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                     Insertar Fila Abajo
                  </button>
                  <button onClick={() => executeHeaderAction('insert_after', {type: 'col', index: cellContextMenu.cellId.replace(/\d/g, '').charCodeAt(0) - 65})} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                     Insertar Columna Lado
                  </button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button onClick={() => executeHeaderAction('delete', {type: 'row', index: parseInt(cellContextMenu.cellId.replace(/\D/g, ''))})} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center justify-between">
                     Eliminar Fila
                  </button>
                  <button onClick={() => executeHeaderAction('delete', {type: 'col', index: cellContextMenu.cellId.replace(/\d/g, '').charCodeAt(0) - 65})} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center justify-between">
                     Eliminar Columna
                  </button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button onClick={() => executeCellAction('delete', cellContextMenu.cellId)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-red-50 flex items-center justify-between">
                     Borrar Contenido
                  </button>
                  <button onClick={() => executeCellAction('clear_formats', cellContextMenu.cellId)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-red-50 flex items-center justify-between">
                     Borrar Formato
                  </button>
              </div>
           </>
       )}

       <div className="flex justify-between items-start mb-3 no-print flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <span className={`text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5`}>
               Hoja de Cálculo
            </span>
            <span className="text-[10px] text-slate-400">Las variables (A1, B2) se autoevalúan.</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
             {!isReadOnly && (
               <>
                 {/* Toggle Connection Button (Asignar / Apagar como resultado) */}
                 <button
                    onClick={() => {
                       const activeUseGridTotal = data.useGridTotal !== false;
                       const nd = { ...data, useGridTotal: !activeUseGridTotal };
                       setData(nd);
                       triggerChange(nd);
                    }}
                    type="button"
                    className={`text-[11px] px-2 py-1 rounded-md border flex items-center gap-1.5 transition-all ${data.useGridTotal !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                    title={data.useGridTotal !== false ? "Vincular Celda: Conectado (Toma el total de la celda de la hoja)" : "Conexión Apagada (Toma los valores de la 'Fórmula de Celda' manual)"}
                 >
                    <span className={`w-1.5 h-1.5 rounded-full ${data.useGridTotal !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    <span>{data.useGridTotal !== false ? "Conectado" : "Apagado"}</span>
                 </button>

                 {!isReadOnly && (
                   <>
                     {(!Object.keys(data.cells).some(k => (data.cells[k] || "").trim() !== "")) ? (
                       <div className="relative" onMouseLeave={() => setTplMenuOpen(false)}>
                          <button type="button" onClick={() => setTplMenuOpen(!tplMenuOpen)} className="text-[11px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1 active:bg-amber-100/50">
                             📐 Plantillas <span className="text-[9px]">▼</span>
                          </button>
                          <div className={`absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-1 ${tplMenuOpen ? 'block' : 'hidden'}`}>
                             <button type="button" onClick={() => loadTemplate("generico")} className="w-full text-left p-1.5 text-[11px] hover:bg-amber-50 hover:text-amber-700 font-medium rounded flex flex-col">
                                <span className="font-semibold text-emerald-800 flex items-center gap-1">📋 Planilla Estándar General</span>
                                <span className="text-[9px] text-slate-400 font-normal font-sans">Soporte oficial con 8 columnas de obras</span>
                             </button>
                             <button type="button" onClick={() => loadTemplate("3d")} className="w-full text-left p-1.5 text-[11px] hover:bg-amber-50 hover:text-amber-700 font-medium rounded flex flex-col border-t border-slate-100">
                                <span>Volumen / Cubicación (3D)</span>
                                <span className="text-[9px] text-slate-400 font-normal">Modelo: Veces × Largo × Ancho × Alto</span>
                             </button>
                             <button type="button" onClick={() => loadTemplate("2d")} className="w-full text-left p-1.5 text-[11px] hover:bg-amber-50 hover:text-amber-700 font-medium rounded flex flex-col border-t border-slate-100">
                                <span>Área / Revestimiento (2D)</span>
                                <span className="text-[9px] text-slate-400 font-normal">Modelo: Veces × Largo × Ancho</span>
                             </button>
                             <button type="button" onClick={() => loadTemplate("simple")} className="w-full text-left p-1.5 text-[11px] hover:bg-amber-50 hover:text-amber-700 font-medium rounded flex flex-col border-t border-slate-100">
                                <span>Metrado Simple (1D)</span>
                                <span className="text-[9px] text-slate-400 font-normal">Suma simple de lista de medidas</span>
                             </button>
                          </div>
                       </div>
                     ) : (
                       <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => loadTemplate("clear")} className="text-[11px] bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded hover:border-red-300 hover:bg-red-100 flex items-center gap-1 active:bg-red-200/50">
                          🗑️ Limpiar Todo
                       </button>
                     )}
                     <div className="w-px h-4 bg-slate-300 mx-1"></div>
                   </>
                 )}

                 {sumMode.active ? (
                     <button onMouseDown={(e) => e.preventDefault()} onClick={finishSumMode} className="text-xs bg-blue-500 text-white border border-blue-600 px-2 py-1 rounded hover:bg-blue-600 flex items-center gap-1 shadow-sm animate-fade-in">
                       <CheckCircle2 size={12} /> Confirmar {sumMode.func}
                     </button>
                 ) : (
                     <div className="relative group" onMouseLeave={() => setSigmaMenuOpen(false)}>
                         <button 
                             onMouseDown={(e) => e.preventDefault()}
                             onClick={() => {
                                 if (!focusedCell) return;
                                 setSumMode({ active: true, startCell: null, endCell: null, func: "SUM" });
                             }} 
                             onMouseEnter={() => setSigmaMenuOpen(true)}
                             disabled={!focusedCell}
                             className={`text-xs bg-white border border-slate-200 p-1.5 rounded hover:border-slate-300 hover:bg-slate-50 flex flex-nowrap items-center gap-1 justify-center ${!focusedCell ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-700 bg-amber-500/5 hover:bg-amber-500/10 border-amber-200'}`}
                             title={focusedCell ? "Auto-Sumatoria (Σ): Seleccione rango de celdas" : "Seleccione una celda primero para añadir sumatoria"}
                         >
                           <Sigma size={13} className="text-amber-600 font-extrabold" />
                           <span className="text-[10px] scale-75 text-slate-400">▼</span>
                         </button>
                         {sigmaMenuOpen && focusedCell && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 flex flex-col py-1 min-w-[120px]">
                               <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setSumMode({ active: true, startCell: null, endCell: null, func: "SUM" }); setSigmaMenuOpen(false); }} className="text-xs text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2">
                                  <Sigma size={12}/> Sum
                               </button>
                               <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setSumMode({ active: true, startCell: null, endCell: null, func: "AVERAGE" }); setSigmaMenuOpen(false); }} className="text-xs text-left px-3 py-1.5 hover:bg-slate-100 border-t border-slate-100">
                                  Average
                               </button>
                               <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setSumMode({ active: true, startCell: null, endCell: null, func: "COUNT" }); setSigmaMenuOpen(false); }} className="text-xs text-left px-3 py-1.5 hover:bg-slate-100 border-t border-slate-100">
                                  Count Numbers
                               </button>
                               <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setSumMode({ active: true, startCell: null, endCell: null, func: "MAX" }); setSigmaMenuOpen(false); }} className="text-xs text-left px-3 py-1.5 hover:bg-slate-100 border-t border-slate-100">
                                  Max
                               </button>
                               <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setSumMode({ active: true, startCell: null, endCell: null, func: "MIN" }); setSigmaMenuOpen(false); }} className="text-xs text-left px-3 py-1.5 hover:bg-slate-100 border-t border-slate-100">
                                  Min
                               </button>
                            </div>
                         )}
                     </div>
                 )}
                 <div className="w-px h-4 bg-slate-300 mx-1"></div>
                 {!isReadOnly && (
                   <div className="flex items-center gap-1 mx-1 bg-white border border-slate-200 p-0.5 rounded">
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ bold: !(data.cellFormats?.[focusedCell || selection.start || ""]?.bold) })} disabled={!focusedCell && !selection.start} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50" title="Negrita">
                        <Bold size={12} strokeWidth={3} />
                     </button>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ italic: !(data.cellFormats?.[focusedCell || selection.start || ""]?.italic) })} disabled={!focusedCell && !selection.start} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50" title="Cursiva">
                        <Italic size={12} strokeWidth={3} />
                     </button>
                     <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ align: 'left' })} disabled={!focusedCell && !selection.start} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50" title="Alinear a la Izquierda">
                        <AlignLeft size={12} strokeWidth={2} />
                     </button>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ align: 'center' })} disabled={!focusedCell && !selection.start} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50" title="Centrar">
                        <AlignCenter size={12} strokeWidth={2} />
                     </button>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ align: 'right' })} disabled={!focusedCell && !selection.start} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50" title="Alinear a la Derecha">
                        <AlignRight size={12} strokeWidth={2} />
                     </button>
                     <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                     <div className="relative group">
                       <button onMouseDown={(e) => e.preventDefault()} disabled={!focusedCell && !selection.start} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 peer" title="Color de Texto y Fondo">
                          <Palette size={12} strokeWidth={2.5} />
                       </button>
                       <div onMouseDown={(e) => e.preventDefault()} className="absolute top-full left-0 mt-1 w-36 bg-white border border-slate-200 rounded shadow-lg hidden group-hover:flex peer-hover:flex hover:flex flex-col p-2 z-50">
                          <div className="text-[9px] font-bold text-slate-500 mb-1 uppercase">Texto</div>
                          <div className="flex gap-1 mb-2">
                            {['#000000', '#2563eb', '#dc2626', '#16a34a', '#d97706'].map(c => (
                              <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ color: c === '#000000' ? undefined : c })} className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: c }}></button>
                            ))}
                          </div>
                          <div className="text-[9px] font-bold text-slate-500 mb-1 uppercase">Fondo</div>
                          <div className="flex gap-1">
                            {['#ffffff', '#bfdbfe', '#fecaca', '#bbf7d0', '#fef08a'].map(c => (
                              <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ bg: c === '#ffffff' ? undefined : c })} className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: c }}></button>
                            ))}
                          </div>
                       </div>
                     </div>
                     <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ decimals: Math.min((data.cellFormats?.[focusedCell || selection.start || ""]?.decimals ?? 2) + 1, 6) })} disabled={!focusedCell && !selection.start} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center font-mono" title="Aumentar decimales">
                        <span className="text-[10px] tracking-tighter leading-none"><span className="opacity-50">.</span>00</span><sup className="text-[7px] -ml-0.5 text-blue-600">+</sup>
                     </button>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat({ decimals: Math.max((data.cellFormats?.[focusedCell || selection.start || ""]?.decimals ?? 2) - 1, 0) })} disabled={!focusedCell && !selection.start} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center font-mono" title="Disminuir decimales">
                        <span className="text-[10px] tracking-tighter leading-none"><span className="opacity-50">.</span>00</span><sup className="text-[7px] -ml-0.5 text-red-600">-</sup>
                     </button>
                   </div>
                 )}
                 <button onMouseDown={(e) => e.preventDefault()} onClick={undo} disabled={historyIndex <= 0} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50" title="Deshacer (Ctrl+Z)">
                   <Undo2 size={12} strokeWidth={2.5} />
                 </button>
                 <button onMouseDown={(e) => e.preventDefault()} onClick={redo} disabled={historyIndex >= history.length - 1} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50" title="Rehacer (Ctrl+Y)">
                   <Redo2 size={12} strokeWidth={2.5} />
                 </button>
                 <button onMouseDown={(e) => e.preventDefault()} onClick={addCol} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1">
                   <Plus size={10} /> Col
                 </button>
                 <button onMouseDown={(e) => e.preventDefault()} onClick={addRow} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1">
                   <Plus size={10} /> Fila
                 </button>
               </>
             )}
             <button 
               onClick={() => setIsFullscreen(!isFullscreen)} 
               className={`text-slate-500 hover:text-slate-700 bg-white border border-slate-200 p-1.5 rounded transition-all`}
               title={isFullscreen ? "Minimizar" : "Ampliar pantalla"}
             >
               {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
             </button>
          </div>
       </div>
       
       <div className={`flex flex-col flex-1 overflow-hidden min-h-0 min-w-0 rounded border border-slate-200 bg-white ${isFullscreen ? 'shadow-xl' : 'shadow-inner'}`}>
         {renderGrid()}
       </div>

       {data.totalCell && data.useGridTotal !== false && (
          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded flex justify-between items-center text-sm shadow-inner no-print">
             <span className="text-emerald-700 font-medium font-sans flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600 animate-pulse" /> Vínculo de Total Activado (Celda {data.totalCell}):</span>
             <span className="font-mono font-black text-emerald-900">{results[data.totalCell] !== undefined ? results[data.totalCell] : 0}</span>
          </div>
       )}
    </div>
  );

  useEffect(() => {
    if (isFullscreen) {
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
  }, [isFullscreen]);

  if (isFullscreen) {
    if (isMobile) {
      return (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-fade-in pointer-events-auto">
          <div className={`bg-${uiColor}-500 px-4 py-3 flex items-center justify-between text-white shrink-0`}>
             <h3 className="font-bold tracking-wider uppercase text-sm select-none truncate flex-1 pr-2">Hoja de Cálculo</h3>
             <button onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }} className="hover:bg-white/20 p-1.5 rounded-full cursor-pointer transition-colors border-0 text-white shrink-0">
                <Minimize2 size={18} />
             </button>
          </div>
          <div className="flex-1 overflow-hidden pointer-events-auto flex flex-col min-h-0 relative p-2">
             {containerContent}
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm animate-fade-in pointer-events-auto"
           onWheel={(e) => e.stopPropagation()}
           onTouchMove={(e) => e.stopPropagation()}
      >
        <Rnd
          default={{
            x: window.innerWidth * 0.1,
            y: window.innerHeight * 0.1,
            width: '80vw',
            height: '80vh',
          }}
          minWidth={300}
          minHeight={300}
          bounds="window"
          dragHandleClassName="modal-drag-handle"
          cancel=".cancel-drag"
          className="bg-slate-50 flex flex-col overflow-hidden shadow-2xl border border-slate-300 rounded-xl p-1"
          style={{ position: "absolute" }}
        >
          <div className={`modal-drag-handle bg-${uiColor}-500 px-6 py-4 flex items-center justify-between text-white rounded-t-lg mb-2 cursor-move shrink-0`}>
             <h3 className="font-bold tracking-wider uppercase text-sm select-none">Hoja de Cálculo - Modo Ampliado</h3>
             <button onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }} className="cancel-drag hover:bg-white/20 p-1.5 rounded-full cursor-pointer transition-colors border-0 text-white">
                <Minimize2 size={18} />
             </button>
          </div>
          <div className="flex-1 overflow-hidden pointer-events-auto p-4 flex flex-col min-h-0">
             {containerContent}
          </div>
        </Rnd>
      </div>
    );
  }

  return containerContent;
}
