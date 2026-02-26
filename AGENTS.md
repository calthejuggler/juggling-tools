# Agent Guide

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Juggling Tools is a full-stack application for querying and visualizing graph data. It's a monorepo with three services:

- **web/** — React frontend (Vite + TanStack Router + Tailwind CSS 4)
- **server/** — Elysia.js backend API (Bun runtime)
- **engine/** — Rust graph computation engine (Axum + Tokio)

Infrastructure: PostgreSQL, Redis, Caddy (production web server).

## Development Commands

```bash
# Start everything (infrastructure + all services with hot reload)
bun run dev

# Infrastructure only (PostgreSQL + Redis via Docker)
bun run dev:infra
bun run dev:infra:down

# Individual services
bun run dev:web          # Vite dev server on :5173
bun run dev:server       # Elysia on :3000 (--watch)
bun run dev:engine       # Rust engine on :8000 (cargo-watch)

# Database (Drizzle ORM)
bun run db:push          # Push schema changes to DB
bun run db:generate      # Generate migration files
bun run db:migrate       # Run migrations
bun run db:studio        # Visual DB explorer

# Linting & Formatting
bun run lint             # ESLint check (web + server + scripts)
bun run lint:fix         # Auto-fix lint errors
bun run format           # Format all files with Prettier
bun run format:check     # Check formatting (CI mode)
bun run typecheck        # TypeScript type-check (web)
```

Environment: copy `.env.example` to `.env` and fill in secrets before running.

## Architecture

### Data Flow (Graph Query)

Client → Server (validates params, checks ETag) → Engine (3-tier cache: memory/Redis/file → compute if miss) → response flows back with ETag for client caching.

### Server (`server/`)

- **Framework**: Elysia.js on Bun, port 3000
- **Routes**: `src/routes/v1/` — versioned API (graphs endpoint)
- **Auth**: better-auth (email/password, sessions) mounted at root
- **DB**: PostgreSQL via Drizzle ORM; schema in `src/db/schema/`; migrations in `drizzle/` and auto-run on startup
- **Config**: `drizzle.config.ts` for Drizzle Kit; env vars loaded via `bun --env-file=../.env`
- **Rate limiting**: `src/lib/rate-limit.ts`

### Web (`web/`)

- **Framework**: React 19 with React Compiler (babel plugin)
- **Routing**: TanStack Router (file-based) — routes in `src/routes/`, pages in `src/pages/`
- **`_authed.tsx`**: Protected route layout wrapper; `__root.tsx`: global layout with devtools
- **Data fetching**: TanStack React Query
- **Forms**: React Hook Form + Zod validation (`src/lib/schemas.ts`)
- **UI components**: Shadcn (Radix UI) in `src/components/ui/`
- **State**: URL search params (no external state library)
- **Auth client**: `src/lib/auth-client.ts` (better-auth client)

### Engine (`engine/`)

- **Framework**: Axum on Tokio, port 8000
- **Auth**: API key via `X-API-Key` header (public: `/v1/health`, protected: `/v1/graphs`)
- **Graph computation**: `src/graph.rs`, `src/transition.rs`
- **3-tier cache** (`src/cache/`): memory (Moka), Redis, file-based
- **Shared state**: `src/state.rs` (AppState with cache handles)
- **Logging**: tracing with JSON subscriber; wide-event request middleware in `src/logging.rs`

### Docker

- `compose.dev.yml`: PostgreSQL + Redis only (for local dev)
- `compose.yml`: Full production stack (all 5 services, two networks: `public` + `internal`)

## Code Style

### Rust (Engine)

- **Write idiomatic Rust** — always self-review Rust code for idiomatic patterns before presenting. This includes iterator chains over imperative loops, proper use of `Option`/`Result` combinators, clean module import paths (`crate::` re-exports over `super::super::`), appropriate use of ownership/borrowing, etc.
- **Doc comments for library consumers** — doc comments should describe what a type or function *is* and *does*, not who calls it. Avoid coupling docs to specific internal callers (e.g. "used by X and Y"). Keep them useful to any consumer of the public API.

## Key Patterns

- **Bun** is the JS runtime and package manager — use `bun install`, `bun run`, not npm/node
- **No tests configured yet** — server and web both have placeholder test scripts
- **Environment variables** are loaded from root `.env` file (server uses `--env-file=../.env`)
- **Drizzle migrations** run automatically on server startup (`src/db/index.ts`)
- **Route file naming**: TanStack Router uses `_` prefix for layout routes, `__root.tsx` for root layout
- **Engine gracefully degrades** without Redis (falls back to memory + file cache)
- **Pre-commit hooks** (lefthook) auto-format and lint staged files on commit
- **Cache versioning**: When the engine response schema changes, bump `SCHEMA_VERSION` in the root `.env` file (single source of truth). Both the engine and server read this env var at startup — it invalidates all three cache tiers (engine memory/Redis/file via the cache key) and browser HTTP cache (via the ETag). The frontend `_v` query param is a static one-time cache bust and does not need bumping.
