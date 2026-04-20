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

**Next.js 14 App Router** with server components and server actions. Auth is handled by NextAuth.js (credentials provider); the session is extended in `types/index.ts` to include `id` and `role`. Middleware at `app/middleware.ts` protects all routes except `/login`.

**Data flow:**
1. `lib/prisma.ts` — singleton Prisma client (Neon PostgreSQL)
2. `lib/shopify.ts` — Shopify Admin REST API wrapper (`syncProducts`, `syncOrders` upsert into DB)
3. `lib/excel.ts` — pricing calculations + XLSX generation + Vercel Blob upload
4. `lib/amazon.ts` — Amazon SP-API helpers
5. `app/api/` — thin route handlers that call lib functions
6. `triggers/` — Trigger.dev background jobs (`shopify-sync` every 6h, `excel-export` on demand)

**Key design:** Shopify products are stored as one DB row **per variant** (not per product). `externalId` is the variant ID, not the product ID. The `@@unique([externalId, storeId])` constraint enables idempotent upserts.

## Pricing Logic

All pricing math is in `lib/excel.ts`:
- Retail price = `costPrice × 2.3`
- Compare-at price = `retailPrice × 1.2`
- At-cost w/ install = `costPrice + ($144 × airHandlerUnits)`

## Database Schema Notes

- `Product.lineItems` is stored as `Json` (raw Shopify line items array)
- `AutomationLog` is append-only — never updated, only created
- Multi-store: every `Product` and `Order` belongs to a `Store`; store platform is `SHOPIFY | AMAZON`

## Environment Variables

See `.env.example`. Required for local dev: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Shopify/Amazon/Trigger.dev/Blob vars are needed for sync features to work.
