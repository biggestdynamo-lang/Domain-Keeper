# Freeable Domains

A full-stack hosting + domain management platform combining GitHub import, auto-deploy pipelines, custom-TLD domain registration, DNS management, and infrastructure monitoring — all free, no payment required.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/freeable-domains run dev` — run the frontend (port 20564, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample data
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`
- Optional env: `CLOUDFLARE_API_TOKEN` — Cloudflare API token with DNS edit permissions; `CLOUDFLARE_ZONE_ID` — Cloudflare zone ID for the domain. When both are set, DNS record CRUD and new-domain default records are synced to Cloudflare automatically. Without them the app runs in DB-only mode (no crash).

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + TailwindCSS v4, shadcn/ui, Wouter routing, Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all contracts)
- `lib/db/src/schema/` — Drizzle ORM table definitions (projects, deployments, domains, dns_records, env_vars, log_entries)
- `artifacts/api-server/src/routes/` — Express route handlers (projects, deployments, domains, dns, env, github, analytics)
- `artifacts/freeable-domains/src/pages/` — React page components
- `artifacts/freeable-domains/src/components/layout.tsx` — Sidebar layout
- `scripts/src/seed.ts` — Database seed script

## Architecture decisions

- Contract-first: OpenAPI spec drives all API shape, Orval generates React Query hooks and Zod schemas
- Async build pipeline simulation: deployment route spawns async setTimeout chain to simulate Clone→Install→Build→Deploy→Verify stages, writing log_entries as it progresses
- Domain search is purely DB-based: registered domains stored in `domains` table, search strips TLD and checks all 9 free TLDs against that table
- Env var values are masked server-side when `encrypted: true` — actual values stored in DB but returned as `••••••••••••`
- Analytics and infrastructure endpoints generate pseudo-random time-series data on each request (no separate metrics store needed for MVP)

## Product

- **Domain Registry**: Search and register free custom-TLD domains (.live, .freeable, .qwerty, .zapto.org, .ai.net, .bot.net, .love, .free.net, .0.com) — no payment, expires in 1 year with auto-renew
- **GitHub Import + Deploy**: Paste a GitHub URL, framework auto-detected (Next.js, Vite, Astro, SvelteKit, Vue, Angular, Express, FastAPI, Flask), build pipeline triggered immediately
- **Project Management**: Per-project deployment history, environment variables (with encryption), domain attachments, build settings
- **DNS Manager**: Full CRUD for A, AAAA, CNAME, TXT, MX, NS, SRV, CAA records per domain
- **Infrastructure Dashboard**: Server nodes across 5 global regions, CPU/memory/storage meters, container counts
- **Analytics**: Time-series charts for requests, bandwidth, and deployments with 7d/30d/90d period selector

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` if you change `lib/db` schemas — lib declarations must be rebuilt first
- Express 5 async handlers must use `{ res.status(404).json(...); return; }` pattern (not `return res.status(...)`) to satisfy TypeScript's "not all code paths return a value" check
- The API server workflow runs on port 8080 (from its `artifact.toml`), proxied at `/api` by the shared reverse proxy

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
