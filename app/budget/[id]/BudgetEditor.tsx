"use client";
import { useMemo, useState, useEffect } from "react";
import ChatPanel from "./ChatPanel";

type Item = {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  materialCostSnapshot: number;
  laborCostSnapshot: number;
  equipmentCostSnapshot: number;
  applyITBIS: boolean;
  notes: string | null;
  chapterId: string;
  apuId: string | null;
  apu: { code: string; description: string } | null;
};

type Chapter = { id: string; code: string; description: string; order: number };

type Version = {
  id: string;
  projectName: string;
  versionNo: number;
  status: string;
  isActive: boolean;
  sourceFileName: string | null;
  notes: string | null;
  chapters: Chapter[];
  items: Item[];
};

type Totals = {
  subtotal: number;
  materialSubtotal: number;
  itbis: number;
  total: number;
  byChapter: { code: string; description: string; subtotal: number }[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function BudgetEditor({
  initialVersion,
  initialTotals,
}: {
  initialVersion: Version;
  initialTotals: Totals;
}) {
  const [version, setVersion] = useState<Version>(initialVersion);
  const [totals, setTotals] = useState<Totals>(initialTotals);
  const [filter, setFilter] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<string>("ALL");
  const [showChat, setShowChat] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isReadOnly = version.status === "APPROVED";

  const filteredItems = useMemo(() => {
    const f = filter.toLowerCase().trim();
    return version.items.filter((it) => {
      if (selectedChapter !== "ALL" && it.chapterId !== selectedChapter) return false;
      if (!f) return true;
      return (
        it.code.toLowerCase().includes(f) ||
        it.description.toLowerCase().includes(f) ||
        (it.apu?.code.toLowerCase().includes(f) ?? false)
      );
    });
  }, [version.items, filter, selectedChapter]);

  async function updateItem(itemId: string, patch: Partial<Pick<Item, "quantity" | "description" | "notes" | "unit">>) {
    setSavingId(itemId);
    try {
      const r = await fetch(`/api/budget/${version.id}/item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, ...patch }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error al guardar");
      setVersion((v) => ({ ...v, items: v.items.map((it) => (it.id === itemId ? { ...it, ...d.item } : it)) }));
      setTotals(d.totals);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingId(null);
    }
  }

  async function approve() {
    if (!confirm("¿Aprobar esta versión? Los precios quedarán congelados.")) return;
    const r = await fetch(`/api/budget/${version.id}/approve`, { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      setVersion((v) => ({ ...v, status: d.version.status }));
    }
  }

  return (
    <div className="space-y-4">
      <header className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">
            {version.projectName} <span className="text-muted">· v{version.versionNo}</span>
          </h1>
          <p className="text-xs text-muted">
            {version.items.length} items · {version.chapters.length} capítulos
            {version.sourceFileName && <> · origen: <code>{version.sourceFileName}</code></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${isReadOnly ? "border-success text-success" : "border-accent text-accent"}`}>
            {version.status}
          </span>
          <button className="btn" onClick={() => setShowChat((v) => !v)}>
            {showChat ? "Ocultar" : "Mostrar"} chat IA
          </button>
          {!isReadOnly && (
            <button className="btn btn-success" onClick={approve}>
              Aprobar versión
            </button>
          )}
        </div>
      </header>

      <div className={`grid gap-4 ${showChat ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="input w-64"
                  placeholder="Filtrar por código, descripción, APU…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <select className="input w-56" value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)}>
                  <option value="ALL">Todos los capítulos</option>
                  {version.chapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.description}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-muted">
                Mostrando <span className="text-white">{filteredItems.length}</span> de {version.items.length}
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2">Cap.</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Unidad</th>
                    <th className="text-right">Cantidad</th>
                    <th className="text-right">PU</th>
                    <th className="text-right">Total</th>
                    <th>APU</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it) => {
                    const ch = version.chapters.find((c) => c.id === it.chapterId);
                    return (
                      <tr key={it.id} className="border-b border-border hover:bg-panel2/50">
                        <td className="px-2 py-1.5 text-muted">{ch?.code}</td>
                        <td className="font-mono text-accent">{it.code}</td>
                        <td className="min-w-[220px]">
                          {isReadOnly ? (
                            <span>{it.description}</span>
                          ) : (
                            <input
                              className="input"
                              defaultValue={it.description}
                              onBlur={(e) => {
                                if (e.target.value !== it.description) updateItem(it.id, { description: e.target.value });
                              }}
                            />
                          )}
                        </td>
                        <td>{it.unit}</td>
                        <td className="text-right">
                          {isReadOnly ? (
                            fmt(it.quantity)
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              className="input w-24 text-right"
                              defaultValue={it.quantity}
                              onBlur={(e) => {
                                const q = parseFloat(e.target.value);
                                if (isFinite(q) && q !== it.quantity) updateItem(it.id, { quantity: q });
                              }}
                            />
                          )}
                        </td>
                        <td className="text-right">{fmt(it.unitPrice)}</td>
                        <td className="text-right font-semibold">{fmt(it.totalPrice)}</td>
                        <td>
                          {it.apu ? (
                            <span className="font-mono text-violet">{it.apu.code}</span>
                          ) : (
                            <span className="text-warn">— sin APU —</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-muted">Sin items en el filtro actual</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {savingId && <p className="mt-2 text-[10px] text-muted">Guardando {savingId.slice(-6)}…</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="text-sm font-bold text-white">Totales</h3>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  <tr className="border-b border-border"><td className="py-1 text-muted">Subtotal</td><td className="text-right">{fmt(totals.subtotal)}</td></tr>
                  <tr className="border-b border-border"><td className="py-1 text-muted">Material (base ITBIS)</td><td className="text-right">{fmt(totals.materialSubtotal)}</td></tr>
                  <tr className="border-b border-border"><td className="py-1 text-muted">ITBIS 18%</td><td className="text-right">{fmt(totals.itbis)}</td></tr>
                  <tr><td className="py-2 font-bold text-white">TOTAL</td><td className="text-right text-base font-bold text-success">DOP {fmt(totals.total)}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3 className="text-sm font-bold text-white">Desglose por capítulo</h3>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {totals.byChapter.map((c) => (
                    <tr key={c.code} className="border-b border-border">
                      <td className="py-1"><code className="text-accent">{c.code}</code> {c.description}</td>
                      <td className="text-right">{fmt(c.subtotal)}</td>
                      <td className="text-right text-muted w-16">{totals.subtotal > 0 ? ((c.subtotal / totals.subtotal) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                  {totals.byChapter.length === 0 && <tr><td className="text-muted">—</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showChat && <ChatPanel versionId={version.id} projectName={version.projectName} />}
      </div>
    </div>
  );
}
