import { NextRequest, NextResponse } from "next/server";
import { askBudget } from "@/lib/ai-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada. Añádela a .env para usar el motor IA." },
      { status: 503 },
    );
  }
  const body = await req.json();
  const history = Array.isArray(body.history) ? body.history : [];
  const query = String(body.query ?? "").trim();
  if (!query) return NextResponse.json({ error: "Consulta vacía" }, { status: 400 });
  try {
    const r = await askBudget(params.id, history, query);
    return NextResponse.json({ answer: r.text, usage: r.usage });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error IA" }, { status: 500 });
  }
}
