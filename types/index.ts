import type { User, Store, Product, Order, ExcelExport, AutomationLog, Task, UserRole, PostponeRequest, Notification, Announcement } from "@prisma/client";

export type { User, Store, Product, Order, ExcelExport, AutomationLog, Task, UserRole, PostponeRequest, Notification, Announcement };

export type ProductWithStore = Product & { store: { id: string; name: string } };
export type OrderWithStore = Order & { store: { id: string; name: string } };

export type StorePlatform = "SHOPIFY" | "AMAZON";
export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type ExportStatus = "PENDING" | "DONE" | "FAILED";
export type AutomationStatus = "SUCCESS" | "FAILED" | "PENDING";
export type TaskStatus = "ASSIGNED" | "SEEN" | "STARTED" | "COMPLETED" | "POSTPONED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type PostponeStatus = "PENDING" | "APPROVED" | "REJECTED";
export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_SEEN"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "POSTPONE_REQUESTED"
  | "POSTPONE_APPROVED"
  | "POSTPONE_REJECTED";

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

export interface PostponeRequestWithUsers extends PostponeRequest {
  requester: TaskUser;
  reviewer?: TaskUser | null;
}

export interface TaskWithUsers extends Task {
  sender: TaskUser;
  assignee: TaskUser;
  postponeRequests?: PostponeRequestWithUsers[];
}

export interface AnnouncementWithAuthor extends Announcement {
  author: { id: string; name: string };
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId: string | null;
  read: boolean;
  createdAt: Date;
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
