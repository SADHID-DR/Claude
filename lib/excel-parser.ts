import * as XLSX from "xlsx";

export type ParsedMaterial = {
  code: string;
  description: string;
  unit: string;
  priceOriginal: number;
  currency: string;
  fxRate: number;
  applyITBIS: boolean;
  category?: string;
};

export type ParsedLabor = { code: string; description: string; unit: string; currentRate: number };
export type ParsedEquipment = { code: string; description: string; unit: string; currentRate: number };
export type ParsedAPU = {
  code: string;
  description: string;
  unit: string;
  overheadPct: number;
  utilityPct: number;
};
export type ParsedAPUComponent = {
  apuCode: string;
  type: "MATERIAL" | "LABOR" | "EQUIPMENT";
  refCode: string;
  quantity: number;
  wastePct: number;
};
export type ParsedChapter = { code: string; description: string; parentCode?: string; order: number };
export type ParsedItem = {
  chapterCode: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  apuCode?: string;
  order: number;
};

export type ParseResult = {
  materials: ParsedMaterial[];
  labors: ParsedLabor[];
  equipments: ParsedEquipment[];
  apus: ParsedAPU[];
  apuComponents: ParsedAPUComponent[];
  chapters: ParsedChapter[];
  items: ParsedItem[];
  sheets: { name: string; rows: number }[];
  warnings: string[];
};

const num = (v: any, def = 0): number => {
  if (v === null || v === undefined || v === "") return def;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return isFinite(n) ? n : def;
};
const str = (v: any): string => (v === null || v === undefined ? "" : String(v).trim());
const bool = (v: any, def = true): boolean => {
  if (v === null || v === undefined || v === "") return def;
  const s = String(v).toLowerCase().trim();
  return s === "true" || s === "sí" || s === "si" || s === "yes" || s === "1" || s === "x";
};

function findSheet(wb: XLSX.WorkBook, candidates: string[]): string | null {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[\s_]+/g, "");
  const names = wb.SheetNames.map((n) => ({ raw: n, norm: normalize(n) }));
  for (const c of candidates) {
    const cn = normalize(c);
    const hit = names.find((n) => n.norm === cn || n.norm.includes(cn));
    if (hit) return hit.raw;
  }
  return null;
}

function rowsOf(wb: XLSX.WorkBook, sheetName: string): Record<string, any>[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
}

function pick(row: Record<string, any>, keys: string[]): any {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[\s_%()]+/g, "");
  const map = new Map<string, any>();
  for (const k of Object.keys(row)) map.set(norm(k), row[k]);
  for (const k of keys) {
    const v = map.get(norm(k));
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

export function parseExcelBuffer(buf: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buf, { type: "array" });
  const warnings: string[] = [];
  const sheets = wb.SheetNames.map((n) => ({ name: n, rows: rowsOf(wb, n).length }));

  // ── Materiales ─────────────────────────────────────────────
  const materials: ParsedMaterial[] = [];
  const matSheet = findSheet(wb, ["Materiales", "Materials", "Material"]);
  if (matSheet) {
    for (const r of rowsOf(wb, matSheet)) {
      const code = str(pick(r, ["código", "codigo", "code"]));
      if (!code) continue;
      materials.push({
        code,
        description: str(pick(r, ["descripcion", "descripción", "description"])),
        unit: str(pick(r, ["unidad", "unit", "u"])),
        priceOriginal: num(pick(r, ["precio", "preciooriginal", "price", "precioorigen"])),
        currency: str(pick(r, ["moneda", "currency"])) || "DOP",
        fxRate: num(pick(r, ["tasa", "fxrate", "tipodecambio"]), 1),
        applyITBIS: bool(pick(r, ["itbis", "aplicaitbis", "aplitbis"]), true),
        category: str(pick(r, ["categoria", "categoría", "category"])) || undefined,
      });
    }
  } else warnings.push("Hoja 'Materiales' no encontrada.");

  // ── Mano de Obra ───────────────────────────────────────────
  const labors: ParsedLabor[] = [];
  const labSheet = findSheet(wb, ["ManodeObra", "Mano de Obra", "MO", "Labor", "ManoObra"]);
  if (labSheet) {
    for (const r of rowsOf(wb, labSheet)) {
      const code = str(pick(r, ["código", "codigo", "code"]));
      if (!code) continue;
      labors.push({
        code,
        description: str(pick(r, ["descripcion", "descripción", "description"])),
        unit: str(pick(r, ["unidad", "unit"])) || "HH",
        currentRate: num(pick(r, ["tarifa", "precio", "rate", "currentrate"])),
      });
    }
  } else warnings.push("Hoja 'Mano de Obra' no encontrada.");

  // ── Equipos ────────────────────────────────────────────────
  const equipments: ParsedEquipment[] = [];
  const eqSheet = findSheet(wb, ["Equipos", "Equipment", "Equipo"]);
  if (eqSheet) {
    for (const r of rowsOf(wb, eqSheet)) {
      const code = str(pick(r, ["código", "codigo", "code"]));
      if (!code) continue;
      equipments.push({
        code,
        description: str(pick(r, ["descripcion", "descripción", "description"])),
        unit: str(pick(r, ["unidad", "unit"])) || "HM",
        currentRate: num(pick(r, ["tarifa", "precio", "rate", "currentrate"])),
      });
    }
  } else warnings.push("Hoja 'Equipos' no encontrada.");

  // ── APU ────────────────────────────────────────────────────
  const apus: ParsedAPU[] = [];
  const apuSheet = findSheet(wb, ["APU", "AnalisisDePrecioUnitario"]);
  if (apuSheet) {
    for (const r of rowsOf(wb, apuSheet)) {
      const code = str(pick(r, ["código", "codigo", "code", "apu"]));
      if (!code) continue;
      apus.push({
        code,
        description: str(pick(r, ["descripcion", "descripción", "description"])),
        unit: str(pick(r, ["unidad", "unit"])),
        overheadPct: num(pick(r, ["overhead", "indirectos", "overheadpct"])),
        utilityPct: num(pick(r, ["utilidad", "utility", "utilitypct"])),
      });
    }
  } else warnings.push("Hoja 'APU' no encontrada.");

  // ── APU Componentes ────────────────────────────────────────
  const apuComponents: ParsedAPUComponent[] = [];
  const compSheet = findSheet(wb, ["APU_Componentes", "APUComponentes", "Componentes", "APUComponents"]);
  if (compSheet) {
    for (const r of rowsOf(wb, compSheet)) {
      const apuCode = str(pick(r, ["apu", "apucode", "código apu", "codigoapu"]));
      const refCode = str(pick(r, ["refcode", "código", "codigo", "ref", "code"]));
      const typeRaw = str(pick(r, ["tipo", "type"])).toUpperCase();
      if (!apuCode || !refCode || !typeRaw) continue;
      const type =
        typeRaw.startsWith("M") ? "MATERIAL" : typeRaw.startsWith("L") || typeRaw.startsWith("MO") ? "LABOR" : "EQUIPMENT";
      apuComponents.push({
        apuCode,
        refCode,
        type,
        quantity: num(pick(r, ["cantidad", "qty", "quantity"])),
        wastePct: num(pick(r, ["desperdicio", "waste", "wastepct"])),
      });
    }
  } else warnings.push("Hoja 'APU_Componentes' no encontrada.");

  // ── Presupuesto ────────────────────────────────────────────
  const chapters: ParsedChapter[] = [];
  const items: ParsedItem[] = [];
  const pSheet = findSheet(wb, ["Presupuesto", "Budget"]);
  if (pSheet) {
    let order = 0;
    let chapterOrder = 0;
    const seenChapters = new Set<string>();
    for (const r of rowsOf(wb, pSheet)) {
      const type = str(pick(r, ["tipo", "type"])).toUpperCase();
      const code = str(pick(r, ["código", "codigo", "code"]));
      if (!code) continue;
      if (type === "CAPITULO" || type === "CAPÍTULO" || type === "CHAPTER" || type.startsWith("CAP")) {
        if (seenChapters.has(code)) continue;
        seenChapters.add(code);
        chapters.push({
          code,
          description: str(pick(r, ["descripcion", "descripción", "description"])),
          parentCode: str(pick(r, ["padre", "parent", "parentcode"])) || undefined,
          order: chapterOrder++,
        });
      } else {
        items.push({
          chapterCode: str(pick(r, ["capítulo", "capitulo", "chapter", "chaptercode"])),
          code,
          description: str(pick(r, ["descripcion", "descripción", "description"])),
          unit: str(pick(r, ["unidad", "unit"])),
          quantity: num(pick(r, ["cantidad", "qty", "quantity"])),
          apuCode: str(pick(r, ["apu", "apucode"])) || undefined,
          order: order++,
        });
      }
    }
  } else warnings.push("Hoja 'Presupuesto' no encontrada.");

  return { materials, labors, equipments, apus, apuComponents, chapters, items, sheets, warnings };
}

export type ValidationError = { kind: string; entity: string; ref?: string; message: string };

export function validate(p: ParseResult): ValidationError[] {
  const errs: ValidationError[] = [];
  const matCodes = new Set(p.materials.map((m) => m.code));
  const labCodes = new Set(p.labors.map((l) => l.code));
  const eqCodes = new Set(p.equipments.map((e) => e.code));
  const apuCodes = new Set(p.apus.map((a) => a.code));
  const chCodes = new Set(p.chapters.map((c) => c.code));

  const seen = new Map<string, number>();
  for (const m of p.materials) seen.set("M:" + m.code, (seen.get("M:" + m.code) ?? 0) + 1);
  for (const l of p.labors) seen.set("L:" + l.code, (seen.get("L:" + l.code) ?? 0) + 1);
  for (const e of p.equipments) seen.set("E:" + e.code, (seen.get("E:" + e.code) ?? 0) + 1);
  for (const a of p.apus) seen.set("A:" + a.code, (seen.get("A:" + a.code) ?? 0) + 1);
  for (const [k, n] of seen) if (n > 1) errs.push({ kind: "duplicate", entity: k.slice(2), ref: k.slice(2), message: `Código duplicado: ${k}` });

  for (const m of p.materials) if (m.priceOriginal < 0) errs.push({ kind: "negative", entity: "Material", ref: m.code, message: `Precio negativo en ${m.code}` });
  for (const l of p.labors) if (l.currentRate < 0) errs.push({ kind: "negative", entity: "Labor", ref: l.code, message: `Tarifa negativa en ${l.code}` });
  for (const e of p.equipments) if (e.currentRate < 0) errs.push({ kind: "negative", entity: "Equipment", ref: e.code, message: `Tarifa negativa en ${e.code}` });

  for (const c of p.apuComponents) {
    if (!apuCodes.has(c.apuCode)) errs.push({ kind: "missing-ref", entity: "APUComponent", ref: c.apuCode, message: `APU ${c.apuCode} no existe` });
    const set = c.type === "MATERIAL" ? matCodes : c.type === "LABOR" ? labCodes : eqCodes;
    if (!set.has(c.refCode)) errs.push({ kind: "missing-ref", entity: "APUComponent", ref: c.refCode, message: `${c.type} ${c.refCode} referenciado en APU ${c.apuCode} no existe` });
    if (c.quantity < 0) errs.push({ kind: "negative", entity: "APUComponent", ref: `${c.apuCode}/${c.refCode}`, message: `Cantidad negativa` });
  }

  for (const it of p.items) {
    if (it.quantity < 0) errs.push({ kind: "negative", entity: "Item", ref: it.code, message: `Cantidad negativa en ${it.code}` });
    if (it.chapterCode && !chCodes.has(it.chapterCode)) errs.push({ kind: "missing-ref", entity: "Item", ref: it.code, message: `Capítulo ${it.chapterCode} no existe (item ${it.code})` });
    if (it.apuCode && !apuCodes.has(it.apuCode)) errs.push({ kind: "missing-ref", entity: "Item", ref: it.code, message: `APU ${it.apuCode} no existe (item ${it.code})` });
    if (it.apuCode) {
      const a = p.apus.find((x) => x.code === it.apuCode);
      if (a && a.unit && it.unit && a.unit.toLowerCase() !== it.unit.toLowerCase())
        errs.push({ kind: "unit-mismatch", entity: "Item", ref: it.code, message: `Unidad item ${it.unit} ≠ APU ${a.unit}` });
    }
  }

  return errs;
}
