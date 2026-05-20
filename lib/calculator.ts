import { prisma } from "./db";

export type APUCalcResult = {
  apuId: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  direct: number;
  overhead: number;
  utility: number;
  unitPrice: number;
};

const ITBIS_RATE = 0.18;

export async function calculateAPU(apuId: string): Promise<APUCalcResult> {
  const apu = await prisma.aPU.findUniqueOrThrow({
    where: { id: apuId },
    include: { components: { include: { material: true, labor: true, equipment: true } } },
  });

  let materialCost = 0;
  let laborCost = 0;
  let equipmentCost = 0;

  for (const c of apu.components) {
    const factor = c.quantity * (1 + c.wastePct / 100);
    if (c.type === "MATERIAL" && c.material) materialCost += factor * c.material.priceLocal;
    else if (c.type === "LABOR" && c.labor) laborCost += factor * c.labor.currentRate;
    else if (c.type === "EQUIPMENT" && c.equipment) equipmentCost += factor * c.equipment.currentRate;
  }

  const direct = materialCost + laborCost + equipmentCost;
  const overhead = direct * (apu.overheadPct / 100);
  const utility = (direct + overhead) * (apu.utilityPct / 100);
  const unitPrice = direct + overhead + utility;

  return { apuId: apu.id, materialCost, laborCost, equipmentCost, direct, overhead, utility, unitPrice };
}

export async function recalculateItem(itemId: string) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } });
  if (!item.apuId) {
    const totalPrice = item.unitPrice * item.quantity;
    return prisma.item.update({ where: { id: itemId }, data: { totalPrice } });
  }
  const r = await calculateAPU(item.apuId);
  const totalPrice = r.unitPrice * item.quantity;
  return prisma.item.update({
    where: { id: itemId },
    data: {
      unitPrice: r.unitPrice,
      totalPrice,
      materialCostSnapshot: r.materialCost * item.quantity,
      laborCostSnapshot: r.laborCost * item.quantity,
      equipmentCostSnapshot: r.equipmentCost * item.quantity,
    },
  });
}

export async function recalculateAllItemsForAPU(apuId: string) {
  const items = await prisma.item.findMany({ where: { apuId, version: { status: "DRAFT" } } });
  for (const it of items) await recalculateItem(it.id);
  return items.length;
}

export async function recalculateBudget(versionId: string) {
  const items = await prisma.item.findMany({ where: { versionId } });
  for (const it of items) await recalculateItem(it.id);
  return computeBudgetTotals(versionId);
}

export async function computeBudgetTotals(versionId: string) {
  const items = await prisma.item.findMany({ where: { versionId }, include: { chapter: true } });
  let subtotal = 0;
  let materialSubtotal = 0;
  let itbis = 0;
  const byChapter = new Map<string, { code: string; description: string; subtotal: number }>();

  for (const it of items) {
    subtotal += it.totalPrice;
    const matPart = it.materialCostSnapshot;
    materialSubtotal += matPart;
    if (it.applyITBIS) itbis += matPart * ITBIS_RATE;

    const key = it.chapterId;
    const existing = byChapter.get(key) ?? { code: it.chapter.code, description: it.chapter.description, subtotal: 0 };
    existing.subtotal += it.totalPrice;
    byChapter.set(key, existing);
  }

  return {
    subtotal,
    materialSubtotal,
    itbis,
    total: subtotal + itbis,
    byChapter: Array.from(byChapter.values()).sort((a, b) => b.subtotal - a.subtotal),
  };
}
