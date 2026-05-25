import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { computeBudgetTotals } from "@/lib/calculator";
import BudgetEditor from "./BudgetEditor";

export const dynamic = "force-dynamic";

export default async function BudgetPage({ params }: { params: { id: string } }) {
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
  if (!v) notFound();
  const totals = await computeBudgetTotals(params.id);
  return <BudgetEditor initialVersion={v as any} initialTotals={totals} />;
}
