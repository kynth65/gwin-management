# GWIN Management App

HVAC Business Management Platform — manage products, orders, Shopify sync, and Excel exports.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **PostgreSQL** via Neon (serverless)
- **Prisma** ORM
- **NextAuth.js** (credentials provider)
- **Trigger.dev** (background jobs)
- **xlsx** (Excel generation)
- **Vercel Blob** (file storage)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd gwin-management
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in all values in `.env`:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon dashboard → Connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for dev |
| `SHOPIFY_*` | Shopify Partners → App credentials |
| `AMAZON_*` | Amazon Developer Console |
| `TRIGGER_API_KEY` | trigger.dev dashboard |
| `BLOB_READ_WRITE_TOKEN` | Vercel dashboard → Storage → Blob |

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Seed an admin user (run once)

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('password123', 12);
  await prisma.user.create({ data: { email: 'admin@example.com', password: hash, name: 'Admin', role: 'ADMIN' } });
  console.log('Admin created');
}
main().finally(() => prisma.\$disconnect());
"
```

### 5. Start development server

```bash
pnpm dev
```

Open http://localhost:3000 — login with `admin@example.com` / `password123`.

### 6. Deploy to Vercel

```bash
vercel --prod
```

Set all environment variables in Vercel dashboard under Project → Settings → Environment Variables.

## Pricing Logic

| Calculation | Formula |
|---|---|
| Retail price | Cost × 2.3 |
| Compare-at price | Retail × 1.2 |
| At-cost w/ install | Cost + $144 per air handler unit |

## Features

- **Dashboard** — summary stats, recent orders, quick actions
- **Products** — searchable/filterable table with HVAC pricing columns, bulk Excel export
- **Orders** — filterable table with expandable line items
- **Automations** — scheduled Shopify sync (every 6h), manual triggers, activity log
- **Settings** — connected stores management, add Shopify store

## Background Jobs (Trigger.dev)

- `shopify-sync` — runs every 6 hours, syncs all products and orders
- `excel-export` — triggered on demand, generates Excel and uploads to Vercel Blob
