// Sembrado mínimo: solo limpia la BD. El presupuesto real entra por /import.
// Si quieres datos automáticos, corre `npm run make:sample` y súbelos vía UI.

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.item.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.budgetVersion.deleteMany();
  await prisma.aPUComponent.deleteMany();
  await prisma.aPU.deleteMany();
  await prisma.materialPriceHistory.deleteMany();
  await prisma.material.deleteMany();
  await prisma.labor.deleteMany();
  await prisma.equipment.deleteMany();
  console.log("✓ BD limpia. Importa un Excel desde /import para empezar.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
