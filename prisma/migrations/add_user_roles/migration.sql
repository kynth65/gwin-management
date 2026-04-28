-- CreateTable: UserRole
CREATE TABLE "UserRole" (
    "id"          TEXT             NOT NULL,
    "name"        TEXT             NOT NULL,
    "isAdmin"     BOOLEAN          NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserRole_name_key" ON "UserRole"("name");

-- Seed default roles (fixed IDs so data migration can reference them)
INSERT INTO "UserRole" ("id", "name", "isAdmin") VALUES
    ('role_admin_default', 'Admin', true),
    ('role_staff_default', 'Staff', false);

-- Add roleId to User (nullable initially so existing rows are not rejected)
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- Migrate existing enum values to the new FK
UPDATE "User" SET "roleId" = 'role_admin_default' WHERE "role" = 'ADMIN';
UPDATE "User" SET "roleId" = 'role_staff_default' WHERE "role" = 'STAFF';

-- Safety net: any row that somehow has no role becomes Staff
UPDATE "User" SET "roleId" = 'role_staff_default' WHERE "roleId" IS NULL;

-- Now enforce NOT NULL + FK
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "UserRole"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- Remove the old enum column and type
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";
