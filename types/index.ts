import type { User, Store, Product, Order, ExcelExport, AutomationLog, Task, UserRole } from "@prisma/client";

export type { User, Store, Product, Order, ExcelExport, AutomationLog, Task, UserRole };

export type ProductWithStore = Product & { store: { id: string; name: string } };
export type OrderWithStore = Order & { store: { id: string; name: string } };

export type StorePlatform = "SHOPIFY" | "AMAZON";
export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type ExportStatus = "PENDING" | "DONE" | "FAILED";
export type AutomationStatus = "SUCCESS" | "FAILED" | "PENDING";
export type TaskStatus = "PENDING" | "ONGOING" | "COMPLETED" | "POSTPONED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface TaskUser {
  id: string;
  name: string;
  role: { name: string; isAdmin: boolean };
}

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: { name: string; isAdmin: boolean };
}

export interface TaskWithUsers extends Task {
  sender: TaskUser;
  assignee: TaskUser;
}

export interface PricingResult {
  costPrice: number;
  retailPrice: number;
  compareAtPrice: number;
  atCostWithInstall: number;
}

export interface LineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku?: string;
}

// Extend next-auth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    isAdmin: boolean;
  }
}
