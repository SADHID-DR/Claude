import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const versions = await prisma.budgetVersion.findMany({
    orderBy: [{ projectName: "asc" }, { versionNo: "desc" }],
    include: { _count: { select: { items: true, chapters: true } } },
  });

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="text-lg font-bold text-white">Presupuestos</h1>
        <p className="mt-1 text-xs text-muted">
          Los presupuestos se crean importando un Excel. La app permite editarlos y hacer consultas en lenguaje natural sobre ellos.
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/import" className="btn btn-primary">+ Importar Excel</Link>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-sm font-bold text-white">Versiones de presupuesto</h2>
        {versions.length === 0 ? (
          <p className="text-xs text-muted">No hay presupuestos aún. Empieza importando un Excel.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2">Proyecto</th>
                <th>Versión</th>
                <th>Estado</th>
                <th>Capítulos</th>
                <th>Items</th>
                <th>Archivo origen</th>
                <th>Creado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="py-2 font-semibold text-white">{v.projectName}</td>
                  <td>v{v.versionNo} {v.isActive && <span className="badge border-success text-success">activa</span>}</td>
                  <td>
                    <span className={`badge ${v.status === "APPROVED" ? "border-success text-success" : "border-accent text-accent"}`}>
                      {v.status}
                    </span>
                  </td>
                  <td>{v._count.chapters}</td>
                  <td>{v._count.items}</td>
                  <td className="text-muted">{v.sourceFileName ?? "—"}</td>
                  <td className="text-muted">{new Date(v.createdAt).toLocaleString()}</td>
                  <td className="text-right">
                    <Link href={`/budget/${v.id}`} className="btn btn-primary">Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
