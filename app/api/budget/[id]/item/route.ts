import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recalculateItem, computeBudgetTotals } from "@/lib/calculator";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { itemId, quantity, description, notes, unit } = body;
  if (!itemId) return NextResponse.json({ error: "itemId requerido" }, { status: 400 });
  const version = await prisma.budgetVersion.findUnique({ where: { id: params.id } });
  if (!version) return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });
  if (version.status === "APPROVED") return NextResponse.json({ error: "Versión aprobada — no editable" }, { status: 423 });

  const data: any = {};
  if (typeof quantity === "number") data.quantity = quantity;
  if (typeof description === "string") data.description = description;
  if (typeof notes === "string") data.notes = notes;
  if (typeof unit === "string") data.unit = unit;
  await prisma.item.update({ where: { id: itemId }, data });
  await recalculateItem(itemId);

  await prisma.auditLog.create({
    data: { versionId: params.id, entity: "Item", entityId: itemId, action: "UPDATE", diff: JSON.stringify(data) },
  });

  const totals = await computeBudgetTotals(params.id);
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  return NextResponse.json({ item, totals });
}
