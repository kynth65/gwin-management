// Run with: node scripts/migrate-task-status.mjs
// Adds new TaskStatus enum values and migrates old PENDING/ONGOING data
// before running pnpm db:push --accept-data-loss

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Step 1: Adding new TaskStatus enum values...");
  // These must run outside a transaction in PostgreSQL
  await prisma.$executeRawUnsafe(`ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'SEEN'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'STARTED'`);
  console.log("  ✓ ASSIGNED, SEEN, STARTED added");

  console.log("Step 2: Migrating existing task data...");
  const pending = await prisma.$executeRawUnsafe(
    `UPDATE "Task" SET status = 'ASSIGNED' WHERE status = 'PENDING'`
  );
  const ongoing = await prisma.$executeRawUnsafe(
    `UPDATE "Task" SET status = 'STARTED' WHERE status = 'ONGOING'`
  );
  console.log(`  ✓ ${pending} PENDING → ASSIGNED`);
  console.log(`  ✓ ${ongoing} ONGOING → STARTED`);

  console.log("\nDone! Now run: pnpm db:push --accept-data-loss");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
