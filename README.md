# MARES — Módulo Presupuestos (MVP)

Prototipo funcional de la arquitectura revisada:

1. **Import Excel → BD** — sube un `.xlsx`, valida, hace preview, persiste como nueva `BudgetVersion`.
2. **Edición In-App** — tabla editable, recálculo en cascada (qty → unitPrice desde APU → totales → ITBIS), ciclo borrador/aprobado.
3. **Motor IA** — chat con Claude que responde preguntas sobre el presupuesto cargado, con razonamiento paso a paso y citando códigos.

## Stack

Next.js 14 (App Router) · Prisma + SQLite · SheetJS · TanStack · Anthropic SDK · Tailwind.

## Primer arranque

```bash
npm install
cp .env.example .env             # añade ANTHROPIC_API_KEY para el chat IA
npx prisma db push               # crea la BD SQLite
npm run make:sample              # genera sample/presupuesto-mares-demo.xlsx
npm run dev                      # http://localhost:3000
```

1. Abre `http://localhost:3000` → **Importar Excel** → sube `sample/presupuesto-mares-demo.xlsx`.
2. Revisa preview / errores → escribe nombre de proyecto → **Importar y abrir editor**.
3. Edita cantidades inline → los totales y el ITBIS se recalculan al guardar.
4. Usa el panel de chat IA a la derecha (requiere `ANTHROPIC_API_KEY` en `.env`).

## Estructura

```
app/
  page.tsx                      # dashboard / listado de versiones
  import/page.tsx               # import wizard (preview + commit)
  budget/[id]/                  # editor + chat IA
  api/import/preview/route.ts   # POST .xlsx → parsed preview + validación
  api/import/commit/route.ts    # POST → persiste como nueva BudgetVersion
  api/budget/[id]/route.ts      # GET versión completa + totales
  api/budget/[id]/item/route.ts # PATCH item (qty/descripción/unidad/notas)
  api/budget/[id]/approve/route.ts
  api/budget/[id]/ai/route.ts   # POST chat con Claude
lib/
  db.ts                         # Prisma client singleton
  excel-parser.ts               # SheetJS parse + validación
  calculator.ts                 # calculateAPU + recalculateItem + totales
  ai-client.ts                  # buildBudgetContext + askBudget
prisma/
  schema.prisma                 # Material/Labor/Equipment/APU/Budget/Item/Audit
scripts/
  make-sample-excel.ts          # genera un xlsx realista para probar
```

## Estado del MVP vs. arquitectura

Implementado:
- Parsing de 6 hojas con auto-detección de columnas (tolerante a acentos/casing).
- Validación: códigos duplicados, valores negativos, refs cruzadas APU↔catálogos, unidad item vs APU.
- Upsert de catálogos · reemplazo de componentes APU · nueva BudgetVersion por import.
- Edición inline de cantidad/descripción/unidad con recálculo en cascada (qty × APU → totales → ITBIS 18%).
- Aprobación de versión (lock implícito: `status = APPROVED` ⇒ read-only).
- Chat IA con contexto inyectado completo (presupuesto activo) y system prompt de analista.
- Audit log automático en import y edición.

Pendiente / Fase 2 (intencionalmente fuera del MVP):
- Lock colaborativo distribuido con TTL (la app es single-tenant local).
- Almacenamiento del .xlsx original en S3/R2.
- Export a Excel/PDF.
- Comparación de versiones.
- Drag-and-drop de reordenamiento.
- Rate limit con Upstash (el chat IA no tiene quota en local).
