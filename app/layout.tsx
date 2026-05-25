import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "MARES — Módulo Presupuestos",
  description: "Importación Excel · Edición In-App · Motor IA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-bg text-text">
        <header className="border-b border-border bg-panel">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/" className="text-sm font-bold tracking-wide text-white">
              MARES <span className="text-muted">· Presupuestos</span>
            </Link>
            <nav className="flex gap-2 text-xs">
              <Link href="/" className="rounded-md border border-border bg-panel2 px-3 py-1.5 hover:border-accent">Inicio</Link>
              <Link href="/import" className="rounded-md border border-border bg-panel2 px-3 py-1.5 hover:border-accent">Importar Excel</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
