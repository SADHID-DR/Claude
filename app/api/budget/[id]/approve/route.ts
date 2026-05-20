import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recalculateBudget } from "@/lib/calculator";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  await recalculateBudget(params.id);
  const v = await prisma.budgetVersion.update({
    where: { id: params.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { versionId: params.id, entity: "BudgetVersion", entityId: params.id, action: "APPROVE" },
  });
  return NextResponse.json({ version: v });
}
