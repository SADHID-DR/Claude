import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeBudgetTotals } from "@/lib/calculator";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const v = await prisma.budgetVersion.findUnique({
    where: { id: params.id },
    include: {
      chapters: { orderBy: { order: "asc" } },
      items: {
        orderBy: { order: "asc" },
        include: { apu: { select: { code: true, description: true } } },
      },
    },
  });
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const totals = await computeBudgetTotals(params.id);
  return NextResponse.json({ version: v, totals });
}
