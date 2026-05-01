# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # TypeScript compile + Next.js build
pnpm lint         # ESLint
pnpm db:migrate   # Run Prisma migrations (dev)
pnpm db:push      # Push schema without migration (prototyping)
pnpm db:generate  # Regenerate Prisma client after schema changes
pnpm db:studio    # Open Prisma Studio GUI
```

Always run `pnpm build` after changes and fix any TypeScript errors before considering work done.

## Architecture

**Next.js 14 App Router** with server components and server actions. Auth is handled by NextAuth.js (credentials provider); the session is extended in `types/index.ts` to include `id`, `role`, and `isAdmin`. Middleware at `app/middleware.ts` protects all routes except `/login`.

**Data flow:**
1. `lib/prisma.ts` — singleton Prisma client (Neon PostgreSQL)
2. `lib/shopify.ts` — Shopify Admin REST API wrapper (`syncProducts`, `syncOrders` upsert into DB; `fetchOrderById` for live order data)
3. `lib/excel.ts` — pricing calculations + XLSX generation + Vercel Blob upload
4. `lib/google-sheets.ts` — Google Sheets integration via `googleapis`; appends rows to a sheet using a base64-encoded service account key (`GOOGLE_SERVICE_ACCOUNT_KEY`)
5. `lib/amazon.ts` — Amazon SP-API helpers
6. `lib/auth.ts` — NextAuth config; JWT includes `id`, `role`, and `isAdmin` from `UserRole`
7. `app/api/` — thin route handlers that call lib functions
8. `triggers/` — Trigger.dev background jobs (`shopify-sync` every 6h, `excel-export` on demand)

**Key design:** Shopify products are stored as one DB row **per variant** (not per product). `externalId` is the variant ID, not the product ID. The `@@unique([externalId, storeId])` constraint enables idempotent upserts. Note: the products UI page has been removed — the `Product` model remains solely for Shopify sync data storage.

## Routes

| Route | Purpose |
|---|---|
| `app/api/users/` | CRUD for users; admin-only create/delete |
| `app/api/roles/` | CRUD for `UserRole`; admin-only create/delete |
| `app/api/tasks/` | Task inbox/sent list + create (staff cannot assign to admins) |
| `app/api/tasks/[id]/` | Update task status/priority, delete |
| `app/api/tasks/[id]/start/` | Assignee marks task as STARTED |
| `app/api/tasks/[id]/complete/` | Assignee marks task as COMPLETED |
| `app/api/tasks/[id]/postpone/` | Assignee submits a postpone request |
| `app/api/tasks/[id]/postpone/[requestId]/` | Sender approves or rejects a postpone request |
| `app/api/tasks/upload/` | Upload task attachment images |
| `app/api/notifications/` | List in-app notifications for current user |
| `app/api/notifications/[id]/` | Mark a notification as read |
| `app/api/announcements/` | List announcements (all users); create (admin-only) |
| `app/api/announcements/[id]/` | Update or delete an announcement (admin-only) |
| `app/api/orders/[id]/add-to-excel/` | Append order rows to Google Sheet (`gwin` or `mrcooldirect`) |
| `app/api/sync/orders/` | Manual Shopify order sync trigger |
| `app/api/profile/` | Update current user's name |
| `app/api/profile/password/` | Change current user's password |

## Authorization

- `session.user.isAdmin` (from `UserRole.isAdmin`) gates admin-only API actions.
- Staff members cannot assign tasks to admin users — enforced in `app/api/tasks/route.ts`.
- Middleware protects: `/dashboard`, `/orders`, `/automations`, `/settings`, `/users`, `/tasks`.

## Pricing Logic

All pricing math is in `lib/excel.ts`:
- Retail price = `costPrice × 2.3`
- Compare-at price = `retailPrice × 1.2`
- At-cost w/ install = `costPrice + ($144 × airHandlerUnits)`

## Database Schema Notes

- `UserRole` — named roles with `isAdmin` flag; every `User` belongs to one role via `roleId`
- `Task` — has `sender` (creator) and `assignee` relations to `User`; statuses: `ASSIGNED | SEEN | STARTED | COMPLETED | POSTPONED`; priorities: `LOW | MEDIUM | HIGH`
- `PostponeRequest` — linked to a `Task`; submitted by the assignee, reviewed by an admin; statuses: `PENDING | APPROVED | REJECTED`; tracks `extensionDays`, optional `assignerNote`, and reviewer metadata
- `Notification` — per-user in-app notifications; types: `TASK_ASSIGNED | TASK_SEEN | TASK_STARTED | TASK_COMPLETED | POSTPONE_REQUESTED | POSTPONE_APPROVED | POSTPONE_REJECTED`; has `read` flag; linked to a `taskId` for deep-linking
- `Announcement` — authored by admin users; has a `pinned` flag; displayed in the dashboard what's-new feed
- `Order.lineItems` is stored as `Json` (raw Shopify line items array)
- `AutomationLog` is append-only — never updated, only created; `SHEET_EXPORT` type logs Google Sheets writes
- Multi-store: every `Product` and `Order` belongs to a `Store`; store platform is `SHOPIFY | AMAZON`

## Google Sheets Export

`app/api/orders/[id]/add-to-excel/route.ts` appends one row per line item to a store-specific Google Sheet. Sheet IDs are resolved by `sheetType` key (`gwin` → `GOOGLE_SHEET_GWIN_ID`, `mrcooldirect` → `GOOGLE_SHEET_MRCOOLDIRECT_ID`). It attempts a live Shopify fetch for shipping/phone data and falls back to DB values if unavailable.

## Environment Variables

See `.env.example`. Required for local dev: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

| Group | Variables |
|---|---|
| Shopify | `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_STORE_URL`, `SHOPIFY_ACCESS_TOKEN` |
| Amazon | `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`, `AMAZON_REFRESH_TOKEN`, `AMAZON_MARKETPLACE_ID` |
| Google Sheets | `GOOGLE_SERVICE_ACCOUNT_KEY` (base64 JSON), `GOOGLE_SHEET_GWIN_ID`, `GOOGLE_SHEET_MRCOOLDIRECT_ID` |
| Trigger.dev | `TRIGGER_API_KEY` |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` |
