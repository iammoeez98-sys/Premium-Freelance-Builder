# FreelanceOS — Freelancer Weekly Planner

A premium SaaS productivity and income tracking system for freelancers. Manage your weekly schedule, track clients, monitor income & expenses, hit financial goals, and get AI-powered smart insights — all in one beautiful command center.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/freelancer-planner run dev` — run the React frontend (port 22106)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts, Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Source-of-truth for all API contracts
- `lib/db/src/schema/` — Database schema files (profile, clients, tasks, income, expenses, goals)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/freelancer-planner/src/pages/` — React page components
- `artifacts/freelancer-planner/src/components/layout/AppLayout.tsx` — Sidebar navigation
- `artifacts/freelancer-planner/src/index.css` — Design tokens (purple + green premium theme)

## Architecture decisions

- Contract-first API design: OpenAPI → Orval codegen → typed React Query hooks
- Drizzle `numeric` columns require string values on insert/update — all route handlers convert numbers to strings with `String(value)` before Drizzle calls, then parse back with `Number()` on serialize
- Profile-based auth state: missing `/api/profile` (404) triggers redirect to onboarding
- Dashboard stats computed server-side from raw DB tables (no materialized views needed at this scale)
- Sidebar layout with `wouter` for client-side routing; base path from `import.meta.env.BASE_URL`

## Product

- **Dashboard**: 6 KPI cards, weekly revenue area chart, client distribution donut, AI smart insights, task completion bar chart
- **Weekly Planner**: 7-day Kanban grid, drag-free task management, quick status toggle, week navigation
- **Clients (CRM)**: Status-based filtering, earnings/pending/projects per client, CRUD
- **Income & Goals**: Revenue tracking with payment status, weekly/monthly/quarterly goal progress bars
- **Expenses**: Category breakdown donut chart, recurring vs one-time tracking, month filtering
- **Goals**: Professional goal tracking with progress bars, category/status filters, quick-complete
- **Analytics**: Multi-chart revenue trends, income vs expenses bar chart, task completion line chart
- **Settings**: Profile, financial goals, work schedule, and light/dark/system theme switcher
- **Onboarding**: 4-step guided setup with animated transitions

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Drizzle `numeric` columns expect strings — always use `String(numericValue)` before `.values()` or `.set()`
- Do not run `pnpm dev` at workspace root — use `restart_workflow` or individual filter commands
- Profile table: only one row should exist (upsert pattern — delete + insert on POST /profile)
- API server reads `PORT` env var (defaults to 8080); proxied at `/api` path by the shared proxy

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/index.ts`
