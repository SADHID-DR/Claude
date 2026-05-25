"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Preview = {
  fileName: string;
  sheets: { name: string; rows: number }[];
  counts: Record<string, number>;
  samples: Record<string, any[]>;
  warnings: string[];
  errors: { kind: string; entity: string; ref?: string; message: string }[];
};

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function doPreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/import/preview", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error de preview");
      setPreview(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function doCommit() {
    if (!file || !projectName.trim()) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectName", projectName.trim());
    try {
      const r = await fetch("/api/import/commit", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error en commit");
      router.push(`/budget/${d.versionId}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  const blockingErrors = preview?.errors.filter((e) => e.kind !== "unit-mismatch") ?? [];

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="text-lg font-bold text-white">Importar presupuesto desde Excel</h1>
        <p className="mt-1 text-xs text-muted">
          Hojas esperadas: <code className="text-text">Materiales · Mano de Obra · Equipos · APU · APU_Componentes · Presupuesto</code>.
          La detección de columnas es por nombre, tolerante a acentos y casing.
        </p>

        <form onSubmit={doPreview} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-muted">Archivo .xlsx</label>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }}
              className="mt-1 text-xs"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!file || busy}>
            {busy ? "Analizando…" : "Analizar"}
          </button>
        </form>
        {error && <p className="mt-3 rounded-md border border-danger bg-red-900/30 px-3 py-2 text-xs text-red-200">{error}</p>}
      </section>

      {preview && (
        <>
          <section className="card">
            <h2 className="text-sm font-bold text-white">Hojas detectadas</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              {preview.sheets.map((s) => (
                <div key={s.name} className="rounded-md border border-border bg-panel2 px-3 py-2">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-muted">{s.rows} filas</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-7">
              {Object.entries(preview.counts).map(([k, v]) => (
                <div key={k} className="rounded-md border border-accent bg-blue-950/40 px-3 py-2">
                  <div className="text-muted">{k}</div>
                  <div className="text-lg font-bold text-accent">{v}</div>
                </div>
              ))}
            </div>
          </section>

          {preview.warnings.length > 0 && (
            <section className="card border-warn">
              <h3 className="text-sm font-bold text-warn">Advertencias</h3>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </section>
          )}

          {preview.errors.length > 0 && (
            <section className={`card ${blockingErrors.length > 0 ? "border-danger" : "border-warn"}`}>
              <h3 className={`text-sm font-bold ${blockingErrors.length > 0 ? "text-danger" : "text-warn"}`}>
                Errores de validación ({preview.errors.length})
                {blockingErrors.length > 0 && " — bloquea importación"}
              </h3>
              <ul className="mt-2 max-h-64 overflow-auto text-xs">
                {preview.errors.map((e, i) => (
                  <li key={i} className="border-b border-border py-1">
                    <span className="badge border-danger text-danger">{e.kind}</span>{" "}
                    <span className="text-muted">{e.entity}</span> {e.ref && <code>{e.ref}</code>} — {e.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <PreviewTables samples={preview.samples} />

          <section className="card">
            <h3 className="text-sm font-bold text-white">Confirmar importación</h3>
            <p className="mt-1 text-xs text-muted">Crea una nueva BudgetVersion en estado BORRADOR y persiste catálogos + APU + items.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-muted">Nombre del proyecto</label>
                <input
                  className="input mt-1 w-72"
                  placeholder="Ej. Torre Las Mares - Bloque A"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <button
                className="btn btn-success"
                onClick={doCommit}
                disabled={busy || !projectName.trim() || blockingErrors.length > 0}
              >
                {busy ? "Importando…" : "Importar y abrir editor"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PreviewTables({ samples }: { samples: Record<string, any[]> }) {
  return (
    <section className="card">
      <h3 className="mb-3 text-sm font-bold text-white">Preview de datos (primeras filas)</h3>
      <div className="space-y-4">
        {Object.entries(samples).map(([key, rows]) => (
          <div key={key}>
            <h4 className="text-xs font-bold uppercase tracking-wide text-accent">{key}</h4>
            {rows.length === 0 ? (
              <p className="text-xs text-muted">— sin datos —</p>
            ) : (
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted">
                    <tr>
                      {Object.keys(rows[0]).map((k) => <th key={k} className="px-2 py-1">{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {Object.keys(rows[0]).map((k) => <td key={k} className="px-2 py-1">{String(r[k] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
