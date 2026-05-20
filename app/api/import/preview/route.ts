import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer, validate } from "@/lib/excel-parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta archivo" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Archivo > 20MB" }, { status: 413 });

  const buf = await file.arrayBuffer();
  const parsed = parseExcelBuffer(buf);
  const errors = validate(parsed);

  return NextResponse.json({
    fileName: file.name,
    sheets: parsed.sheets,
    counts: {
      materials: parsed.materials.length,
      labors: parsed.labors.length,
      equipments: parsed.equipments.length,
      apus: parsed.apus.length,
      apuComponents: parsed.apuComponents.length,
      chapters: parsed.chapters.length,
      items: parsed.items.length,
    },
    samples: {
      materials: parsed.materials.slice(0, 10),
      labors: parsed.labors.slice(0, 10),
      equipments: parsed.equipments.slice(0, 10),
      apus: parsed.apus.slice(0, 10),
      apuComponents: parsed.apuComponents.slice(0, 15),
      chapters: parsed.chapters.slice(0, 10),
      items: parsed.items.slice(0, 15),
    },
    warnings: parsed.warnings,
    errors,
  });
}
