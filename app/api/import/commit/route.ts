import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer, validate } from "@/lib/excel-parser";
import { prisma } from "@/lib/db";
import { recalculateBudget } from "@/lib/calculator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const projectName = (form.get("projectName") as string) || "Proyecto sin nombre";
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta archivo" }, { status: 400 });

  const buf = await file.arrayBuffer();
  const p = parseExcelBuffer(buf);
  const errors = validate(p);
  const blocking = errors.filter((e) => e.kind !== "unit-mismatch");
  if (blocking.length > 0) return NextResponse.json({ error: "Validación fallida", errors: blocking }, { status: 422 });

  // Upsert catálogos
  for (const m of p.materials) {
    const fx = m.fxRate || 1;
    await prisma.material.upsert({
      where: { code: m.code },
      create: {
        code: m.code,
        description: m.description,
        unit: m.unit,
        category: m.category,
        currency: m.currency,
        fxRate: fx,
        priceOriginal: m.priceOriginal,
        priceLocal: m.priceOriginal * fx,
        applyITBIS: m.applyITBIS,
      },
      update: {
        description: m.description,
        unit: m.unit,
        category: m.category,
        currency: m.currency,
        fxRate: fx,
        priceOriginal: m.priceOriginal,
        priceLocal: m.priceOriginal * fx,
        applyITBIS: m.applyITBIS,
      },
    });
  }
  for (const l of p.labors) {
    await prisma.labor.upsert({
      where: { code: l.code },
      create: { code: l.code, description: l.description, unit: l.unit, currentRate: l.currentRate },
      update: { description: l.description, unit: l.unit, currentRate: l.currentRate },
    });
  }
  for (const e of p.equipments) {
    await prisma.equipment.upsert({
      where: { code: e.code },
      create: { code: e.code, description: e.description, unit: e.unit, currentRate: e.currentRate },
      update: { description: e.description, unit: e.unit, currentRate: e.currentRate },
    });
  }

  // Upsert APUs + reemplazar componentes
  for (const a of p.apus) {
    await prisma.aPU.upsert({
      where: { code: a.code },
      create: { code: a.code, description: a.description, unit: a.unit, overheadPct: a.overheadPct, utilityPct: a.utilityPct },
      update: { description: a.description, unit: a.unit, overheadPct: a.overheadPct, utilityPct: a.utilityPct },
    });
  }

  const apuMap = new Map((await prisma.aPU.findMany()).map((x) => [x.code, x.id]));
  const matMap = new Map((await prisma.material.findMany()).map((x) => [x.code, x.id]));
  const labMap = new Map((await prisma.labor.findMany()).map((x) => [x.code, x.id]));
  const eqMap = new Map((await prisma.equipment.findMany()).map((x) => [x.code, x.id]));

  // Reemplazar componentes APU (delete + recreate por código)
  const apusInImport = new Set(p.apus.map((a) => a.code));
  for (const code of apusInImport) {
    const apuId = apuMap.get(code);
    if (!apuId) continue;
    await prisma.aPUComponent.deleteMany({ where: { apuId } });
  }
  for (const c of p.apuComponents) {
    const apuId = apuMap.get(c.apuCode);
    if (!apuId) continue;
    const data: any = { apuId, type: c.type, quantity: c.quantity, wastePct: c.wastePct };
    if (c.type === "MATERIAL") data.materialId = matMap.get(c.refCode);
    else if (c.type === "LABOR") data.laborId = labMap.get(c.refCode);
    else data.equipmentId = eqMap.get(c.refCode);
    await prisma.aPUComponent.create({ data });
  }

  // Marcar versiones previas activas como inactivas
  await prisma.budgetVersion.updateMany({
    where: { projectName, isActive: true },
    data: { isActive: false },
  });
  const lastVersion = await prisma.budgetVersion.findFirst({
    where: { projectName },
    orderBy: { versionNo: "desc" },
  });
  const versionNo = (lastVersion?.versionNo ?? 0) + 1;

  const version = await prisma.budgetVersion.create({
    data: {
      projectName,
      versionNo,
      isActive: true,
      status: "DRAFT",
      sourceFileName: file.name,
    },
  });

  // Capítulos
  const chMap = new Map<string, string>();
  for (const c of p.chapters) {
    const created = await prisma.chapter.create({
      data: {
        versionId: version.id,
        code: c.code,
        description: c.description,
        order: c.order,
      },
    });
    chMap.set(c.code, created.id);
  }
  // Asignar parent en pasada secundaria
  for (const c of p.chapters) {
    if (c.parentCode && chMap.get(c.parentCode)) {
      await prisma.chapter.update({
        where: { id: chMap.get(c.code)! },
        data: { parentId: chMap.get(c.parentCode)! },
      });
    }
  }

  for (const it of p.items) {
    const chapterId = chMap.get(it.chapterCode);
    if (!chapterId) continue;
    await prisma.item.create({
      data: {
        versionId: version.id,
        chapterId,
        apuId: it.apuCode ? apuMap.get(it.apuCode) : null,
        code: it.code,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        order: it.order,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      versionId: version.id,
      entity: "BudgetVersion",
      entityId: version.id,
      action: "CREATE",
      diff: JSON.stringify({ source: "excel_import", fileName: file.name, counts: { items: p.items.length, apus: p.apus.length } }),
    },
  });

  await recalculateBudget(version.id);

  return NextResponse.json({ versionId: version.id, versionNo, projectName });
}
