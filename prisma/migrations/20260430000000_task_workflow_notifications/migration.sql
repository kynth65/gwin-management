-- Migration: Task workflow statuses, postpone requests, and notifications
-- Run this SQL against your database BEFORE running pnpm db:generate

-- Step 1: Add new TaskStatus values (must run outside a transaction in Postgres)
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'SEEN';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'STARTED';

-- Step 2: Migrate existing data to new status names
UPDATE "Task" SET status = 'ASSIGNED'::"TaskStatus" WHERE status = 'PENDING'::"TaskStatus";
UPDATE "Task" SET status = 'STARTED'::"TaskStatus" WHERE status = 'ONGOING'::"TaskStatus";

-- Step 3: Recreate TaskStatus with only the new values (removes PENDING and ONGOING)
CREATE TYPE "TaskStatus_new" AS ENUM ('ASSIGNED', 'SEEN', 'STARTED', 'COMPLETED', 'POSTPONED');
ALTER TABLE "Task" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN status TYPE "TaskStatus_new" USING status::text::"TaskStatus_new";
DROP TYPE "TaskStatus";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
ALTER TABLE "Task" ALTER COLUMN status SET DEFAULT 'ASSIGNED'::"TaskStatus";

-- Step 4: Create new enum types
CREATE TYPE "PostponeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_SEEN', 'TASK_STARTED', 'TASK_COMPLETED', 'POSTPONE_REQUESTED', 'POSTPONE_APPROVED', 'POSTPONE_REJECTED');

-- Step 5: Add emailNotifications to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN NOT NULL DEFAULT false;

-- Step 6: Create PostponeRequest table
CREATE TABLE IF NOT EXISTS "PostponeRequest" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "extensionDays" INTEGER NOT NULL,
    "status" "PostponeStatus" NOT NULL DEFAULT 'PENDING',
    "assignerNote" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostponeRequest_pkey" PRIMARY KEY ("id")
);

-- Step 7: Create Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "taskId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Step 8: Foreign keys and indexes for PostponeRequest
ALTER TABLE "PostponeRequest" ADD CONSTRAINT "PostponeRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostponeRequest" ADD CONSTRAINT "PostponeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PostponeRequest" ADD CONSTRAINT "PostponeRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "PostponeRequest_taskId_idx" ON "PostponeRequest"("taskId");
CREATE INDEX IF NOT EXISTS "PostponeRequest_requesterId_idx" ON "PostponeRequest"("requesterId");
CREATE INDEX IF NOT EXISTS "PostponeRequest_status_idx" ON "PostponeRequest"("status");

-- Step 9: Foreign keys and indexes for Notification
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
