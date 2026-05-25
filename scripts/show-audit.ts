import { prisma } from "../lib/db";

async function run() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`  AuditLog entries: ${logs.length}\n`);
  for (const l of logs) {
    const diff = l.diff ? JSON.parse(l.diff) : null;
    const summary = diff ? JSON.stringify(diff).slice(0, 75) : "";
    const t = new Date(l.createdAt).toISOString().slice(11, 19);
    console.log(`  ${t}  ${l.action.padEnd(7)}  ${l.entity.padEnd(14)}  ${summary}`);
  }
  await prisma.$disconnect();
}
run();
