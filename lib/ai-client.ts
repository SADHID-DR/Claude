import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";
import { computeBudgetTotals } from "./calculator";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Eres un analista experto en presupuestos de construcción de la República Dominicana.
Trabajas para MARES sobre el presupuesto del proyecto "{projectName}".

REGLAS:
- Razona paso a paso antes de responder. Muestra brevemente tu razonamiento en bullets cortos.
- Cita siempre los códigos de APU e Items que utilizaste en el cálculo.
- Si un item no tiene APU vinculado, indícalo explícitamente; no inventes datos.
- Usa las unidades del presupuesto (m³, qq, gln, etc.) tal y como aparecen.
- Si no puedes calcular con certeza, dilo claramente.
- Responde en español, conciso. Termina con la respuesta numérica clara cuando aplique.
- No tienes acceso a información fuera del presupuesto cargado (ej. precios de mercado actuales). Si te preguntan, indícalo.`;

export async function buildBudgetContext(versionId: string) {
  const v = await prisma.budgetVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      items: {
        include: {
          apu: {
            include: {
              components: { include: { material: true, labor: true, equipment: true } },
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  const totals = await computeBudgetTotals(versionId);

  const compact = {
    project: v.projectName,
    version: v.versionNo,
    status: v.status,
    currency: "DOP",
    totals: {
      subtotal: round(totals.subtotal),
      materialSubtotal: round(totals.materialSubtotal),
      itbis: round(totals.itbis),
      total: round(totals.total),
    },
    chapters: v.chapters.map((c) => ({ code: c.code, description: c.description })),
    items: v.items.map((it) => {
      const chapter = v.chapters.find((c) => c.id === it.chapterId);
      return {
        code: it.code,
        chapter: chapter?.code,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: round(it.unitPrice),
        totalPrice: round(it.totalPrice),
        apu: it.apu
          ? {
              code: it.apu.code,
              description: it.apu.description,
              components: it.apu.components.map((c) => ({
                type: c.type,
                code: c.material?.code ?? c.labor?.code ?? c.equipment?.code,
                description: c.material?.description ?? c.labor?.description ?? c.equipment?.description,
                unit: c.material?.unit ?? c.labor?.unit ?? c.equipment?.unit,
                qty: c.quantity,
                waste: c.wastePct,
                rate: round(c.material?.priceLocal ?? c.labor?.currentRate ?? c.equipment?.currentRate ?? 0),
              })),
            }
          : null,
      };
    }),
  };
  return compact;
}

const round = (n: number) => Math.round(n * 100) / 100;

export async function askBudget(versionId: string, history: ChatMessage[], userQuery: string) {
  const ctx = await buildBudgetContext(versionId);
  const sys = SYSTEM_PROMPT.replace("{projectName}", ctx.project);

  const contextBlock = `<budget_context>\n${JSON.stringify(ctx)}\n</budget_context>`;
  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: `Contexto del presupuesto (solo lectura):\n${contextBlock}` },
    { role: "assistant", content: "Entendido. Tengo el presupuesto cargado. ¿Cuál es tu pregunta?" },
    ...history.slice(-8),
    { role: "user", content: userQuery },
  ];

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: sys,
    messages,
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { text, usage: resp.usage };
}
