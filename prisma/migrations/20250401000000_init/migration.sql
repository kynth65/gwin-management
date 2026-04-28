-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('SHOPIFY', 'AMAZON');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'ONGOING', 'COMPLETED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "UserRole" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "isAdmin"     BOOLEAN      NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserRole_name_key" ON "UserRole"("name");

-- CreateTable
CREATE TABLE "User" (
    "id"        TEXT         NOT NULL,
    "email"     TEXT         NOT NULL,
    "password"  TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "roleId"    TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "UserRole"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Store" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "platform"    "Platform"   NOT NULL,
    "accessToken" TEXT         NOT NULL,
    "storeUrl"    TEXT         NOT NULL,
    "lastSyncAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Store_platform_idx" ON "Store"("platform");

-- CreateTable
CREATE TABLE "Product" (
    "id"             TEXT             NOT NULL,
    "storeId"        TEXT             NOT NULL,
    "externalId"     TEXT             NOT NULL,
    "title"          TEXT             NOT NULL,
    "sku"            TEXT             NOT NULL,
    "price"          DECIMAL(10,2)    NOT NULL,
    "compareAtPrice" DECIMAL(10,2),
    "costPrice"      DECIMAL(10,2),
    "inventory"      INTEGER          NOT NULL DEFAULT 0,
    "status"         "ProductStatus"  NOT NULL DEFAULT 'ACTIVE',
    "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_externalId_storeId_key" ON "Product"("externalId", "storeId");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_externalId_idx" ON "Product"("externalId");
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Order" (
    "id"            TEXT          NOT NULL,
    "storeId"       TEXT          NOT NULL,
    "externalId"    TEXT          NOT NULL,
    "orderNumber"   TEXT          NOT NULL,
    "customerName"  TEXT          NOT NULL,
    "customerEmail" TEXT          NOT NULL,
    "totalPrice"    DECIMAL(10,2) NOT NULL,
    "status"        TEXT          NOT NULL,
    "lineItems"     JSONB         NOT NULL,
    "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_externalId_storeId_key" ON "Order"("externalId", "storeId");
CREATE INDEX "Order_externalId_idx" ON "Order"("externalId");
CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");
CREATE INDEX "Order_status_idx" ON "Order"("status");

ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ExcelExport" (
    "id"        TEXT           NOT NULL,
    "userId"    TEXT           NOT NULL,
    "fileName"  TEXT           NOT NULL,
    "fileUrl"   TEXT           NOT NULL,
    "type"      TEXT           NOT NULL,
    "status"    "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExcelExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExcelExport_userId_idx" ON "ExcelExport"("userId");
CREATE INDEX "ExcelExport_status_idx" ON "ExcelExport"("status");

ALTER TABLE "ExcelExport" ADD CONSTRAINT "ExcelExport_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id"        TEXT               NOT NULL,
    "type"      TEXT               NOT NULL,
    "status"    "AutomationStatus" NOT NULL DEFAULT 'PENDING',
    "message"   TEXT               NOT NULL,
    "payload"   JSONB,
    "createdAt" TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationLog_type_idx" ON "AutomationLog"("type");
CREATE INDEX "AutomationLog_status_idx" ON "AutomationLog"("status");
CREATE INDEX "AutomationLog_createdAt_idx" ON "AutomationLog"("createdAt");

-- CreateTable
CREATE TABLE "Task" (
    "id"          TEXT           NOT NULL,
    "title"       TEXT           NOT NULL,
    "description" TEXT,
    "status"      "TaskStatus"   NOT NULL DEFAULT 'PENDING',
    "priority"    "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate"     TIMESTAMP(3),
    "senderId"    TEXT           NOT NULL,
    "assigneeId"  TEXT           NOT NULL,
    "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)   NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_senderId_idx" ON "Task"("senderId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

ALTER TABLE "Task" ADD CONSTRAINT "Task_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
