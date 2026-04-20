import type { User, Store, Product, Order, ExcelExport, AutomationLog } from "@prisma/client";

export type { User, Store, Product, Order, ExcelExport, AutomationLog };

export type ProductWithStore = Product & { store: { id: string; name: string } };
export type OrderWithStore = Order & { store: { id: string; name: string } };

export type UserRole = "ADMIN" | "STAFF";
export type StorePlatform = "SHOPIFY" | "AMAZON";
export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type ExportStatus = "PENDING" | "DONE" | "FAILED";
export type AutomationStatus = "SUCCESS" | "FAILED" | "PENDING";

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
      role: UserRole;
    };
  }
}
