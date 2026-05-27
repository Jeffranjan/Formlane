# Formlane Monorepo — Architecture

> A type-safe, end-to-end TypeScript monorepo for **Formlane** — a form builder for creators who care about craft. The repo pairs a Next.js 16 frontend with an Express + tRPC backend, sharing types and contracts through Turborepo workspace packages.

---

## Project Identity

| Field | Value |
| --- | --- |
| Repo name | `trpc-monorepo` |
| Product name | **Formlane** |
| Package manager | `pnpm@9.0.0` (workspaces) |
| Build orchestrator | `turbo@^2.7.2` |
| Language | TypeScript 5.9 (strict) |
| Node | `>=18` |
| Database | PostgreSQL 15 (via Docker) |

---

## High-Level Architecture

```
┌──────────────────────────────────────────┐
│  Browser (React 19 / Next.js 16 client)  │
└──────────────┬───────────────────────────┘
               │  tRPC over HTTP (typed)
┌──────────────▼───────────────────────────┐
│   apps/web  (Next.js App Router)         │
│   • RSC: createTRPCProxyClient (server)  │
│   • CSR: trpc.Provider + React Query     │
└──────────────┬───────────────────────────┘
               │  HTTP (NEXT_PUBLIC_API_URL)
┌──────────────▼───────────────────────────┐
│   apps/api  (Express 5)                  │
│   /trpc        → tRPC adapter            │
│   /api         → REST via trpc-to-openapi│
│   /openapi.json + /docs (Scalar UI)      │
└──────────────┬───────────────────────────┘
               │
    ┌──────────┼──────────────────────┐
    ▼          ▼                      ▼
┌────────┐ ┌──────────┐ ┌──────────────────┐
│@repo/  │ │@repo/    │ │  @repo/logger    │
│services│ │database  │ │  (winston)       │
└────────┘ └────┬─────┘ └──────────────────┘
                ▼
         ┌────────────┐
         │ PostgreSQL │
         └────────────┘
```

---

## Workspace Layout

```
trpc-monorepo/
├─ apps/
│  ├─ api/              → Express + tRPC HTTP server (port 8000)
│  └─ web/              → Next.js 16 App Router frontend (port 3000)
├─ packages/
│  ├─ database/         → Drizzle ORM + Postgres + migrations + shared validators
│  ├─ trpc/             → Shared tRPC router (server) + client types
│  ├─ services/         → Domain services (auth, form, response, analytics, etc.)
│  ├─ logger/           → Winston logger (env-aware formatting)
│  ├─ eslint-config/    → Shared ESLint flat configs
│  ├─ typescript-config/ → Shared tsconfig presets
│  └─ test-utils/       → fast-check arbitraries for property tests
├─ docker-compose.yml   → Postgres 15 dev container
├─ pnpm-workspace.yaml
├─ turbo.json
└─ package.json
```

---

## Apps

### `apps/api` — Express + tRPC server

| Path | Purpose |
| --- | --- |
| `GET /` | Liveness banner |
| `GET /health` | Health check |
| `GET /openapi.json` | Auto-generated OpenAPI doc |
| `GET /docs` | Scalar API Reference UI |
| `/api/*` | REST endpoints (via `trpc-to-openapi`) |
| `/trpc/*` | Native tRPC HTTP middleware |

### `apps/web` — Next.js 16 frontend

App Router with route groups:
- `(app)` — authenticated dashboard (forms, editor, responses, analytics)
- `(auth)` — sign-in / sign-up
- `(marketing)` — landing page, explore, pricing
- `f/[slug]` — public form runner

UI: shadcn/ui + Radix primitives, Tailwind v4, motion, recharts.

---

## Packages

### `@repo/database`
- Drizzle ORM + PostgreSQL
- Models: users, sessions, forms, fields, responses, answers, rate-limit-buckets
- Shared Zod validators (`validators/field.ts`) used by both services and tRPC

### `@repo/trpc`
- Shared tRPC router consumed by the API app
- Routers: health, auth, forms, analytics, responses, explore, submissions
- Client package exports `ServerRouter` type for end-to-end type safety

### `@repo/services`
- Domain services: auth, form, response, analytics, validation, slug, rate-limit, spam-filter, password-hasher, user
- Each service encapsulates business logic and DB access

### `@repo/logger`
- Winston wrapper with env-aware formatting (colorized dev, JSON prod)

---

## Key Patterns

1. **Type-only cross-app coupling.** `apps/web` imports `ServerRouter` as a type from `@repo/trpc/client` — zero runtime coupling.
2. **Single router, three transports.** One `serverRouter` serves tRPC, REST, and OpenAPI docs.
3. **Procedure metadata drives REST.** Each route's `.meta({ openapi: {...} })` generates REST endpoints and OpenAPI spec.
4. **Shared field validators.** `@repo/database/validators/field.ts` is the single source of truth for field schemas, consumed by both `@repo/services` and `@repo/trpc`.
5. **Session-based auth.** `createContext` resolves the session cookie, populates `ctx.user` for `protectedProcedure`.
6. **IP hashing.** Client IPs are sha256-hashed with a secret before storage (rate limiting, submissions).

---

## Running the Stack

```sh
pnpm install
docker compose up -d
pnpm db:migrate
pnpm dev                # api on :8000, web on :3000
```

---

## Environment Variables

| Variable | Required by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `@repo/database` | Postgres connection string |
| `GOOGLE_OAUTH_CLIENT_ID` | `@repo/services` | Google OAuth |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `@repo/services` | Google OAuth |
| `GOOGLE_OAUTH_REDIRECT_URI` | `@repo/services` | Google OAuth callback |
| `IP_HASH_SECRET` | `@repo/trpc` | Salt for IP hashing |
| `NODE_ENV` | multiple | `development` or `production` |
| `PORT` | `apps/api` | Default 8000 |
| `BASE_URL` | `apps/api` | Default `http://localhost:8000` |
| `NEXT_PUBLIC_API_URL` | `apps/web` | API URL for client |
| `ALLOWED_ORIGINS` | `apps/api` | Comma-separated CORS origins |
