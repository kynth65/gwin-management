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
7. `lib/config-cache.ts` — `getBusinessConfig()` cached via `unstable_cache` with a 5-min TTL and `"business-config"` tag; the customization PATCH route calls `revalidateTag("business-config")` to bust it
8. `app/api/` — thin route handlers that call lib functions
9. `triggers/` — Trigger.dev background jobs (`shopify-sync` every 6h, `excel-export` on demand, `overdue-tasks` scheduled job that creates `TASK_OVERDUE` notifications)

**Key design:** Shopify products are stored as one DB row **per variant** (not per product). `externalId` is the variant ID, not the product ID. The `@@unique([externalId, storeId])` constraint enables idempotent upserts. Note: the products UI page has been removed — the `Product` model remains solely for Shopify sync data storage.

## Routes

| Route | Purpose |
|---|---|
| `app/api/users/` | CRUD for users; admin-only create/delete |
| `app/api/roles/` | CRUD for `UserRole`; admin-only create/delete |
| `app/api/tasks/` | Task inbox/sent list + create (staff cannot assign to admins) |
| `app/api/tasks/[id]/` | Update task status/priority/dueDate (PATCH, admin-only); soft-delete (DELETE) |
| `app/api/tasks/[id]/start/` | Assignee marks task as STARTED |
| `app/api/tasks/[id]/complete/` | Assignee marks task as COMPLETED |
| `app/api/tasks/[id]/postpone/` | Assignee submits a postpone request |
| `app/api/tasks/[id]/postpone/[requestId]/` | Sender approves or rejects a postpone request |
| `app/api/tasks/[id]/restore/` | Restore a soft-deleted task (admin-only) |
| `app/api/tasks/[id]/permanent/` | Permanently delete a soft-deleted task (admin-only) |
| `app/api/tasks/upload/` | Upload task attachment images |
| `app/api/time/clock-in/` | Start a new work session for current user |
| `app/api/time/clock-out/` | End the active work session and record duration |
| `app/api/time/status/` | Get current clock-in status for current user |
| `app/api/time/entries/` | List time entries (work session history) for current user |
| `app/api/notifications/` | List in-app notifications for current user |
| `app/api/notifications/[id]/` | Mark a notification as read |
| `app/api/announcements/` | List announcements (all users); create (admin-only) |
| `app/api/announcements/[id]/` | Update or delete an announcement (admin-only) |
| `app/api/orders/[id]/add-to-excel/` | Append order rows to Google Sheet (`gwin` or `mrcooldirect`) |
| `app/api/sync/orders/` | Manual Shopify order sync trigger |
| `app/api/profile/` | Update current user's name |
| `app/api/profile/password/` | Change current user's password |

## Tasks UI

`components/tasks/tasks-content.tsx` drives the `/tasks` page. Key behaviors:
- **Search bar** — filters by title, description, sender name, or assignee name; resets when switching tabs.
- **Admin-only controls** — Create Task button and Deleted tab are hidden from non-admin users.
- **Resume Task** (`components/tasks/task-detail.tsx`) — shown on POSTPONED tasks for the assignee or admin; PATCHes status back to `STARTED`.

`components/shared/sidebar.tsx` uses `pendingHref` state for instant active-link feedback — the clicked link lights up immediately before the route change completes, then clears once `pathname` catches up.

## Time Tracking UI

`components/time/time-content.tsx` drives the `/time` page. It has three main tabs: **Time** (clock-in/out), **Activity** (session history), and **Reports** (aggregated view). The Reports tab has two sub-tabs:

- **Time Sheet** — shows regular hours, unpaid break, and paid hours per member (no pay data).
- **Pay** — shows pay rate, paid hours, and estimated pay per member; visible to all users but only meaningful when `hourlyRate` is set. Admins viewing "My Data" mode still get `hourlyRate` enriched from the full staff list so per-user pay is accurate.

`buildMemberReports` (same file) aggregates `TimeEntry` rows into per-member totals. When `isAdmin && reportAll` an optional `allStaff` list is passed so members with zero hours still appear as rows.

## Dashboard

`app/(app)/dashboard/page.tsx` uses granular `Suspense` streaming: `CardSection`, `DashboardTable`, and `DashboardFeed` are separate async server components so each streams independently. `overdueTasks` in the stats card is scoped — admins see all overdue tasks, staff see only their own. The `pendingExports` card has been removed.

`WhatsNewFeed` (`components/dashboard/whats-new-feed.tsx`) merges **announcements** and **notifications** into a single chronological feed. It accepts `initialAnnouncements` as an SSR prop (fetched in `DashboardFeed`) so the feed renders without a client-side waterfall. Notifications are styled per type using the `NOTIF_STYLE` map.

## Authorization

- `session.user.isAdmin` (from `UserRole.isAdmin`) gates admin-only API actions.
- **Only admins can create tasks** — enforced in `app/api/tasks/route.ts` (POST returns 403 for non-admins).
- The Tasks UI hides the Create Task button and the Deleted tab from non-admin users.
- Middleware protects: `/dashboard`, `/orders`, `/automations`, `/settings`, `/users`, `/tasks`, `/time`.

## Pricing Logic

All pricing math is in `lib/excel.ts`:
- Retail price = `costPrice × 2.3`
- Compare-at price = `retailPrice × 1.2`
- At-cost w/ install = `costPrice + ($144 × airHandlerUnits)`

## Database Schema Notes

- `UserRole` — named roles with `isAdmin` flag; every `User` belongs to one role via `roleId`
- `Task` — has `sender` (creator) and `assignee` relations to `User`; statuses: `ASSIGNED | SEEN | STARTED | COMPLETED | POSTPONED`; priorities: `LOW | MEDIUM | HIGH`; `deletedAt` (nullable) enables soft delete — queries must filter `deletedAt: null` for active tasks; the Tasks UI has an Inbox, Sent, and Deleted tab (Deleted is admin-only); task list queries are capped (`take: 100` inbox/sent, `take: 50` deleted)
- `PostponeRequest` — linked to a `Task`; submitted by the assignee, reviewed by an admin; statuses: `PENDING | APPROVED | REJECTED`; tracks `extensionDays`, optional `assignerNote`, and reviewer metadata
- `Notification` — per-user in-app notifications; types: `TASK_ASSIGNED | TASK_SEEN | TASK_STARTED | TASK_COMPLETED | POSTPONE_REQUESTED | POSTPONE_APPROVED | POSTPONE_REJECTED | TASK_OVERDUE`; has `read` flag; linked to a `taskId` for deep-linking
- `TimeEntry` — tracks per-user work sessions; `clockIn` (DateTime) and `clockOut` (nullable DateTime); duration calculated on clock-out; linked to `User`; `User.hourlyRate` (Decimal, nullable) is used in the Reports Pay sub-tab to calculate estimated pay
- `Announcement` — authored by admin users; has a `pinned` flag; displayed in the dashboard what's-new feed
- `Order.lineItems` is stored as `Json` (raw Shopify line items array)
- `AutomationLog` is append-only — never updated, only created; `SHEET_EXPORT` type logs Google Sheets writes
- Multi-store: every `Product` and `Order` belongs to a `Store`; store platform is `SHOPIFY | AMAZON`

## Users Page

`components/users/users-page-client.tsx` is a client wrapper that holds shared `users` state between `UsersTable` and `AddUserForm`. The server page (`app/(app)/users/page.tsx`) fetches users + roles and passes them as props; the client component handles optimistic list updates without a full page refresh.

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
