"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "¿Cuál es la partida más cara del presupuesto?",
  "¿Cuántas fundas de cemento se necesitan en total?",
  "¿Qué items no tienen APU vinculado?",
  "¿Cuánto representa cada capítulo del total?",
  "Si el cemento sube 15%, ¿cuánto sube el total?",
];

export default function ChatPanel({ versionId, projectName }: { versionId: string; projectName: string }) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, busy]);

  async function send(q?: string) {
    const query = (q ?? input).trim();
    if (!query || busy) return;
    setError("");
    setHistory((h) => [...h, { role: "user", content: query }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch(`/api/budget/${versionId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, history }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error IA");
      setHistory((h) => [...h, { role: "assistant", content: d.answer }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="card flex h-[calc(100vh-12rem)] flex-col lg:sticky lg:top-4">
      <header className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <h3 className="text-sm font-bold text-cyan">Motor IA</h3>
          <p className="text-[10px] text-muted">Analista sobre {projectName}</p>
        </div>
        {history.length > 0 && (
          <button className="btn text-[10px]" onClick={() => setHistory([])}>Limpiar</button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
        {history.length === 0 && (
          <div className="space-y-2">
            <p className="text-muted">Pregunta lo que necesites del presupuesto. Ejemplos:</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="rounded-md border border-border bg-panel2 px-2 py-1.5 text-left text-[11px] text-text hover:border-cyan"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-6" : "mr-6"}>
            <div className={`text-[10px] uppercase tracking-wide ${m.role === "user" ? "text-success" : "text-cyan"}`}>
              {m.role === "user" ? "Tú" : "IA"}
            </div>
            <div className={`mt-1 whitespace-pre-wrap rounded-md px-2 py-1.5 ${m.role === "user" ? "bg-green-950/40 border border-success/50" : "bg-panel2 border border-cyan/40"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="mr-6 animate-pulse text-cyan">IA pensando…</div>}
        {error && <p className="rounded-md border border-danger bg-red-900/30 px-2 py-1 text-red-200">{error}</p>}
      </div>

      <form
        className="border-t border-border pt-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <textarea
          className="input min-h-[60px] resize-none"
          placeholder="Escribe tu pregunta…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          disabled={busy}
        />
        <button className="btn btn-primary mt-1.5 w-full" type="submit" disabled={busy || !input.trim()}>
          Enviar
        </button>
      </form>
    </aside>
  );
}
