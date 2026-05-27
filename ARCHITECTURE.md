# Streamyst Monorepo — Architecture & Analysis

> A type-safe, end-to-end TypeScript monorepo for **Streamyst** ("Stream in Style"), a media forwarding application. The repo pairs a Next.js 16 frontend with an Express + tRPC backend, sharing types and contracts through Turborepo workspace packages.

---

## 1. Project Identity

| Field | Value |
| --- | --- |
| Repo name | `trpc-monorepo` |
| Product name (in code) | **Streamyst** |
| Tagline | *Stream in Style — Media Forwarding* |
| Package manager | `pnpm@9.0.0` (workspaces) |
| Build orchestrator | `turbo@^2.7.2` |
| Language | TypeScript 5.9 (strict) |
| Node | `>=18` |
| Database | PostgreSQL 15 (via Docker) |

The repo bootstrapped from the official Turborepo starter (the `README.md` still reflects that), but has been rewritten into a real product scaffold around tRPC + Drizzle + Next 16.

---

## 2. High-Level Architecture

```
                         ┌──────────────────────────────────────────┐
                         │  Browser (React 19 / Next.js 16 client)  │
                         └──────────────┬───────────────────────────┘
                                        │  tRPC over HTTP (typed)
                                        │  fetch(credentials:"include")
                         ┌──────────────▼───────────────────────────┐
                         │   apps/web  (Next.js App Router)         │
                         │   • RSC: createTRPCProxyClient (server)  │
                         │   • CSR: trpc.Provider + React Query     │
                         └──────────────┬───────────────────────────┘
                                        │  HTTP  (NEXT_PUBLIC_API_URL)
                         ┌──────────────▼───────────────────────────┐
                         │   apps/api  (Express 5)                  │
                         │   /trpc        → tRPC adapter            │
                         │   /api         → REST via trpc-to-openapi│
                         │   /openapi.json + /docs (Scalar UI)      │
                         └──────────────┬───────────────────────────┘
                                        │  imports
                         ┌──────────────▼───────────────────────────┐
                         │   @repo/trpc  (router definitions)       │
                         │   ├── routes/health                       │
                         │   └── routes/auth                         │
                         └──────────────┬───────────────────────────┘
                                        │
            ┌───────────────────────────┼──────────────────────────┐
            ▼                           ▼                          ▼
  ┌──────────────────┐      ┌────────────────────┐      ┌──────────────────┐
  │  @repo/services  │      │  @repo/database    │      │   @repo/logger   │
  │  (business logic)│─────▶│  Drizzle ORM       │      │   winston        │
  │  • UserService   │      │  • users table     │      └──────────────────┘
  │  • google-oauth  │      └─────────┬──────────┘
  └──────────────────┘                │
                                       ▼
                              ┌────────────────────┐
                              │  PostgreSQL 15     │
                              │  (docker-compose)  │
                              └────────────────────┘
```

---

## 3. Workspace Layout

```
trpc-monorepo/
├─ apps/
│  ├─ api/        → Express + tRPC HTTP server (port 8000)
│  └─ web/        → Next.js 16 App Router frontend (port 3000)
├─ packages/
│  ├─ database/         → Drizzle ORM + Postgres client + migrations
│  ├─ trpc/             → Shared tRPC router (server) + client types
│  ├─ services/         → Domain services (User, Google OAuth)
│  ├─ logger/           → Winston logger (env-aware formatting)
│  ├─ eslint-config/    → Shared ESLint flat configs
│  └─ typescript-config/→ Shared tsconfig presets (base/node/nextjs)
├─ docker-compose.yml   → Postgres 15 dev container
├─ pnpm-workspace.yaml  → workspace globs (apps/*, packages/*)
├─ turbo.json           → task graph & caching
├─ setup.sh             → symlinks root .env into every workspace
└─ package.json         → root scripts (dev/build/db:* via dotenv-cli + turbo)
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`turbo.json` task graph:
- `build` → topological (`^build`), caches `.next/**` (excluding cache)
- `dev` → not cached, persistent
- `db:generate`, `db:migrate` → no-ops at the orchestration level (delegated)
- `lint`, `check-types` → topological

Root scripts use `dotenv -- turbo …` so a single root `.env` (linked into each workspace by `setup.sh`) feeds every task.

---

## 4. Apps

### 4.1 `apps/api` — Express + tRPC server

**Stack:** Express 5, `@trpc/server` 11, `trpc-to-openapi`, `@scalar/express-api-reference`, tsup, tsx, Zod.

**Entry chain:** `src/index.ts` → boots `http.createServer(app)` on `PORT` (default 8000) → `src/server.ts` wires the Express app.

**`src/server.ts` exposes four surfaces from one router (`@repo/trpc/server`):**

| Path | Purpose |
| --- | --- |
| `GET /` | Liveness banner (`Streamyst is up and running...`) |
| `GET /health` | Plain JSON health check |
| `GET /openapi.json` | Auto-generated OpenAPI doc via `generateOpenApiDocument(serverRouter, …)` |
| `GET /docs` | Scalar API Reference UI (reads `/openapi.json`) |
| `POST/GET /api/*` | REST-style endpoints created by `createOpenApiExpressMiddleware` (driven by `meta.openapi` on each procedure) |
| `POST /trpc/*` | Native tRPC HTTP middleware |

CORS is wide-open (`origin: "*"`) outside of `NODE_ENV=prod`. JSON body parsing is enabled globally.

**Env (`src/env.ts`)** parsed with Zod:
- `PORT?` (default 8000)
- `NODE_ENV` ∈ `development | prod`
- `BASE_URL` (default `http://localhost:8000`) — used to compute the OpenAPI `baseUrl` (`${BASE_URL}/api`).

**Build:** `tsup` bundles to `dist/` with `minify`, `clean`, `bundle`, `noExternal: ["@teachyst"]` (placeholder org rule), and copies `.json` loaders. Dev runs through `tsx watch`.

### 4.2 `apps/web` — Next.js 16 frontend

**Stack:** Next.js 16, React 19, Tailwind v4 (PostCSS plugin), `@tanstack/react-query` v5, `@trpc/react-query`, `next-themes`, shadcn/ui (style: `new-york`, base: `neutral`, RSC enabled), Radix UI primitives, Lucide icons, `react-hook-form` + Zod resolvers, `sonner` for toasts, `recharts`, `embla-carousel`, `vaul`, `cmdk`, `input-otp`.

**App Router structure:**
- `app/layout.tsx` — wraps `<GlobalProviders>`, loads Geist (Sans/Mono) via `next/font/local`, hard-codes `<html className="dark">`. Metadata title is `Streamyst`.
- `app/page.tsx` — async RSC that calls `await api.health.getHealth.query()` and renders status. Demonstrates server-side tRPC use.
- `app/globals.css` — Tailwind v4 with `@theme inline` design tokens (oklch palette) and `dark` variant.

**Providers (`providers/global.tsx`, client component):**
- Memoizes a `QueryClient` (staleTime: Infinity, refetchOnMount: true).
- Creates a tRPC client via `trpc.createClient({ links: [createTRPCHttpBatchClientClient()] })`.
- Stacks providers: `QueryClientProvider` → `NextThemesProvider` (defaultTheme `light`, system enabled) → `trpc.Provider` → children + `<Toaster/>`.

**tRPC bridge (`apps/web/trpc/`):**

| File | Role |
| --- | --- |
| `client.ts` | `trpc = createTRPCReact<ServerRouter>()` for hooks |
| `create-client.ts` | Factory returning `httpLink` or `httpBatchStreamLink` (toggled by `enableStreaming`), `credentials: "include"`, URL = `NEXT_PUBLIC_API_URL ?? "/trpc"` |
| `server.ts` | `api = createTRPCProxyClient<ServerRouter>(…)` for RSC/server actions, plus `apiStreaming` variant |

`ServerRouter` is imported as a *type only* from `@repo/trpc/client`, giving end-to-end type safety with zero runtime coupling between the two apps.

**Env (`env.js`):** validated by `@t3-oss/env-nextjs` with `NEXT_PUBLIC_API_URL?` on the client side. `SKIP_ENV_VALIDATION` and `emptyStringAsUndefined` are wired up.

**Path alias:** `~/*` → workspace root of `apps/web` (set in both `tsconfig.json` and `components.json`).

**UI library:** shadcn/ui has been installed extensively — 53 components in `components/ui/` covering accordion, alert/alert-dialog, calendar, carousel, chart, command, dialog, drawer, form, input, sidebar, sheet, sonner, table, etc.

---

## 5. Packages

### 5.1 `@repo/database`

Postgres + Drizzle ORM layer.

- `index.ts` → `db = drizzle(env.DATABASE_URL)` using `drizzle-orm/node-postgres`, re-exports all of `drizzle-orm`.
- `schema.ts` → barrel re-exporting `models/*`.
- `models/user.ts` → `usersTable` (`pgTable("users")`):
  - `id` uuid PK (default `gen_random_uuid()`)
  - `fullName` varchar(80) not null
  - `email` varchar(255) not null **unique**
  - `emailVerified` boolean default false
  - `profileImageUrl` text
  - `createdAt` timestamp default now()
  - `updatedAt` timestamp with `$onUpdate(() => new Date())`
  - Exports `SelectUser` / `InsertUser` inferred types.
- `drizzle.config.ts` → drizzle-kit config (out: `./drizzle`, schema: `./schema.ts`, dialect: postgresql).
- `drizzle/0000_dusty_morg.sql` → the initial migration matching the schema above.
- Scripts: `db:generate`, `db:migrate`, `dev` (drizzle-kit studio).
- Env (`env.ts`): only `DATABASE_URL` (Zod-validated).

### 5.2 `@repo/trpc`

The shared tRPC router lives here, *not* inside the API app — this is what lets the web client import the router type without importing any backend code.

```
packages/trpc/
├─ server/
│  ├─ trpc.ts      → initTRPC.meta<OpenApiMeta>().context<…>().create()
│  ├─ context.ts   → createContext (currently empty)
│  ├─ schema.ts    → Zod re-export + zodUndefinedModel helper
│  ├─ index.ts     → serverRouter = router({ health, auth })
│  ├─ routes/
│  │  ├─ health/route.ts → GET /health → { status: "healthy" }
│  │  └─ auth/route.ts   → GET /authentication/supported-providers
│  ├─ services/index.ts  → singleton instances (e.g. userService)
│  └─ utils/path-generator.ts → `generatePath(base)(path)` builds `/base/path`
└─ client/index.ts → infers RouterInputs / RouterOutputs, re-exports @trpc/client
```

Every procedure attaches `meta: { openapi: { method, path, tags } }`, which is what `trpc-to-openapi` consumes in the API app to expose REST + the OpenAPI doc.

### 5.3 `@repo/services`

Domain services consumed by the tRPC router.

- `user/index.ts` → `UserService` with `getAuthenticationMethods()`. It checks whether `GOOGLE_OAUTH_CLIENT_ID` & `GOOGLE_OAUTH_CLIENT_SECRET` are configured; if so, it uses `googleOAuth2Client.generateAuthUrl()` to return a `GOOGLE_OAUTH` provider entry.
- `user/model.ts` → `getAuthenticationMethodOutputSchema` (Zod) — the wire contract reused by the tRPC route.
- `clients/google-oauth.ts` → `OAuth2Client` from `google-auth-library`, configured from env.
- `env.ts` → requires `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`.
- Depends on `@repo/database` and `@repo/logger`.

### 5.4 `@repo/logger`

Winston wrapper with environment-aware formatting:
- Dev → colorized, timestamped, pretty-printed meta.
- Prod → JSON with timestamp.
- Level resolution: `LOGGER_LEVEL ?? (NODE_ENV === "development" ? "debug" : "error")`.
- Single `Console` transport.

### 5.5 `@repo/eslint-config`

Flat-config ESLint presets:
- `base.js` — JS recommended + `typescript-eslint` recommended + `eslint-plugin-turbo` (warns on undeclared env vars) + `eslint-plugin-only-warn` + Prettier compat.
- `next.js` — extends base, adds React, React Hooks, `@next/next` (incl. `core-web-vitals`).
- `react-internal.js` — extends base, adds React + React Hooks for shared component libs.

### 5.6 `@repo/typescript-config`

Three presets:
- `base.json` — strict, ES2022, `noUncheckedIndexedAccess`, `isolatedModules`, declarations on.
- `node.json` — extends base; CommonJS / Node moduleResolution.
- `nextjs.json` — extends base; ESNext modules, bundler resolution, JSX preserve, no-emit, allowJs/checkJs.

---

## 6. End-to-End Request Flow

### Server-side render (RSC) calling a tRPC query

1. `app/page.tsx` (server component) imports `api` from `~/trpc/server`.
2. `api` is a `createTRPCProxyClient<ServerRouter>` configured with `httpLink` to `NEXT_PUBLIC_API_URL ?? "/trpc"`.
3. `await api.health.getHealth.query()` issues an HTTP request to `apps/api`'s `/trpc/health.getHealth`.
4. The Express tRPC middleware runs `createContext` (currently empty), invokes the procedure in `packages/trpc/server/routes/health/route.ts`.
5. Zod validates input/output. Result returns to the RSC and is rendered.

### Client-side query (CSR)

1. `<GlobalProviders>` builds a singleton `trpcClient` and `QueryClient`.
2. Components call `trpc.<route>.useQuery(...)` from `@repo/trpc/client` (typed via `ServerRouter`).
3. React Query caches results (`staleTime: Infinity`); requests go through the same `httpLink` (or `httpBatchStreamLink` if streaming is opted in).
4. Server processes identically to (1).

### REST entry path (for non-tRPC consumers)

1. The same `serverRouter` is fed into `createOpenApiExpressMiddleware` mounted under `/api`.
2. Each procedure's `meta.openapi.path` is what the REST URL maps to (e.g. `/authentication/supported-providers`).
3. `generateOpenApiDocument` produces a spec at `/openapi.json`, rendered as an interactive reference at `/docs` via Scalar.

### Authentication (current state)

- Wire-frame only. `auth.getSupportedAuthenticationProviders` returns the list of available providers (currently Google OAuth if configured) along with a fresh `authUrl` from Google's OAuth2 client.
- No callback handler, session, or persistence is wired yet — the `users` table and `createContext` exist but aren't populated.

---

## 7. Configuration & Environments

### Single-source `.env`
`setup.sh` copies `.env.example` → `.env` (if missing) and **hardlinks** the root `.env` into every `apps/*` and `packages/*` directory so each workspace sees the same variables. (Note: the script uses `link` which is hard-link semantics on POSIX; on Windows you'd typically run this through Git Bash / WSL.)

### Required environment variables (collected from each Zod schema)

| Variable | Required by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `@repo/database` | e.g. `postgres://postgres:postgres@localhost:5432/dev` |
| `GOOGLE_OAUTH_CLIENT_ID` | `@repo/services` | Required (currently always validated; service skips usage if both ID and secret are empty) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `@repo/services` | Same |
| `GOOGLE_OAUTH_REDIRECT_URI` | `@repo/services` | Required |
| `NODE_ENV` | `@repo/logger`, `apps/api` | `development \| prod` |
| `LOGGER_LEVEL?` | `@repo/logger` | `error \| info \| debug` |
| `PORT?` | `apps/api` | default 8000 |
| `BASE_URL?` | `apps/api` | default `http://localhost:8000`; powers OpenAPI baseUrl |
| `NEXT_PUBLIC_API_URL?` | `apps/web` | If unset, web defaults to `/trpc` (same-origin) |
| `SKIP_ENV_VALIDATION?` | `apps/web` | Skips T3 env validation (Docker builds) |

### Postgres dev container (`docker-compose.yml`)

```yaml
services:
  postgresdb:
    image: postgres:15
    container_name: postgresdb
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: dev
    ports: ["5432:5432"]
    volumes: [pg_data:/var/lib/postgresql/data]
volumes:
  pg_data:
```

Matches the default `DATABASE_URL` users would derive: `postgres://postgres:postgres@localhost:5432/dev`.

---

## 8. Tooling & Developer Experience

- **Turborepo TUI** (`"ui": "tui"`) for nicer parallel logs.
- **Prettier** at the root: 2-space tabs, double quotes, semicolons, trailing commas all, 100-col width.
- **ESLint flat config** per workspace, all extending `@repo/eslint-config/*`.
- **`only-warn`** plugin downgrades errors to warnings (CI failure surface is controlled per-app, e.g. `next lint --max-warnings 0` in `apps/web`).
- **`turbo/no-undeclared-env-vars`** rule enforces that any `process.env.X` is declared in `turbo.json` (helps cache correctness).
- **Type-checking** is per-app: `next typegen && tsc --noEmit` for web; standard `tsc` elsewhere.
- **`dotenv-cli`** is used at the root for every script that needs env (`turbo dev`, `turbo build`, db tasks) so `.env` is loaded once before delegation.

---

## 9. Notable Patterns

1. **Type-only cross-app coupling.** `apps/web` imports `ServerRouter` from `@repo/trpc/client` as a *type*. The web app never imports from `apps/api`, so the api binary stays out of the Next.js bundle while still giving the client end-to-end type safety.
2. **Single router, three transports.** `serverRouter` is consumed by (a) the native tRPC adapter, (b) `createOpenApiExpressMiddleware` for REST, and (c) `generateOpenApiDocument` for the docs UI. One source of truth, three public surfaces.
3. **Procedure metadata drives REST.** Each route attaches `.meta({ openapi: { method, path, tags } })` and uses Zod `.input()` / `.output()` schemas — the OpenAPI doc and REST routes are derived entirely from these.
4. **`generatePath` helper.** Small utility in `server/utils/path-generator.ts` builds clean route prefixes (e.g. `getPath = generatePath("/authentication"); getPath("/supported-providers")` → `/authentication/supported-providers`).
5. **Service singletons in tRPC.** `packages/trpc/server/services/index.ts` instantiates `new UserService()` once and shares it across procedures, keeping route handlers thin.
6. **Streaming opt-in.** `createTRPCHttpBatchClientClient({ enableStreaming: true })` swaps `httpLink` for `httpBatchStreamLink`, and `apps/web/trpc/server.ts` exposes both `api` and `apiStreaming` proxies.
7. **Empty `createContext`.** Currently a no-op (`async function createContext({}) {}`). Auth/session wiring is scaffolded but not yet implemented — this is the obvious next extension point.
8. **Hard-coded dark mode.** `app/layout.tsx` sets `<html className="dark">` while `next-themes` defaults to `"light"` — a small inconsistency worth flagging.

---

## 10. Running the Stack

### First-time setup
```sh
pnpm install
docker compose up -d        # Postgres on :5432
sh ./setup.sh               # creates .env from .env.example and links to workspaces
pnpm db:generate            # only if schema changes
pnpm db:migrate             # applies migrations to the DB
```

### Day-to-day
```sh
pnpm dev                    # turbo dev: api on :8000, web on :3000
pnpm build                  # turbo build (api → tsup, web → next build)
pnpm lint
pnpm check-types
pnpm format                 # prettier --write **/*.{ts,tsx,md}
```

### Useful URLs
| URL | Description |
| --- | --- |
| `http://localhost:3000` | Web frontend |
| `http://localhost:8000` | API root banner |
| `http://localhost:8000/health` | Express-level health |
| `http://localhost:8000/trpc/health.getHealth` | tRPC health |
| `http://localhost:8000/api/health` | REST health (via `meta.openapi`) |
| `http://localhost:8000/openapi.json` | OpenAPI spec |
| `http://localhost:8000/docs` | Scalar API reference UI |

---

## 11. Strengths & Suggested Next Steps

**Strengths**
- Clean separation between transport (`apps/api`), contract (`@repo/trpc`), and domain logic (`@repo/services`).
- Zero-cost type sharing across the stack with no codegen step.
- One router → tRPC + REST + OpenAPI + interactive docs is a strong DX pattern.
- Strict TS config across the board (`noUncheckedIndexedAccess`, `isolatedModules`).
- Drizzle migrations are checked-in and reproducible.

**Gaps / next moves**
- `createContext` is empty — populate it with the request, parsed cookie/JWT, DB handle, and a logged-in user.
- Auth flow only exposes provider URLs; no `/auth/google/callback`, no session table, no email/password fallback yet.
- README still references the upstream Turborepo starter; replace with Streamyst-specific docs.
- CORS is `*` outside prod — fine for dev, but worth tightening to the web origin once auth lands (cookies + `credentials: "include"` already imply same-site).
- `app/layout.tsx` forces `dark` while `next-themes` defaultTheme is `"light"` — pick one source of truth.
- Consider a `protectedProcedure` once auth context exists, instead of the current single `publicProcedure`.
- Add tests (Vitest/Jest) — there are currently none.
