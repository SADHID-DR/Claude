import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const versions = await prisma.budgetVersion.findMany({
    orderBy: [{ projectName: "asc" }, { versionNo: "desc" }],
    include: { _count: { select: { items: true, chapters: true } } },
  });
  return NextResponse.json({ versions });
}
