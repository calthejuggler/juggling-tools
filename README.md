# Juggling Tools

Compute and explore siteswap juggling state graphs. Pick a number of props and a max throw height, and the app generates every valid juggling state and the throws between them.

## How it works

Each juggling state is stored as a 32-bit field where set bits represent future beats when a prop will land. The engine finds all valid states for a given `(num_props, max_height)` pair, then works out every legal throw between them to build a directed graph.

## Tech stack

| Layer    | Stack                                                                    |
| -------- | ------------------------------------------------------------------------ |
| Frontend | React 19, Vite, TanStack Router + Query, Tailwind CSS 4, Shadcn/Radix UI |
| Backend  | Elysia.js (Bun), better-auth, Drizzle ORM, PostgreSQL                    |
| Engine   | Rust, Axum, Tokio with a 3-tier cache (memory / Redis / file)            |
| Infra    | Docker Compose, Caddy                                                    |

## Prerequisites

- [Bun](https://bun.sh)
- [Rust](https://rustup.rs) (for the engine)
- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL and Redis)
- [cargo-watch](https://github.com/watchexec/cargo-watch) (optional, for engine hot reload)

## Getting started

```bash
cp .env.example .env
# fill in your secrets

bun run dev
```

This starts PostgreSQL and Redis in Docker, waits for them to be healthy, installs dependencies if needed, then launches the frontend (:5173), server (:3000), and engine (:8000) with hot reload. Containers are torn down automatically when you stop the script.

## Project structure

```
web/       React frontend
server/    Elysia API - auth, validation, caching proxy to the engine
engine/    Rust graph computation with multi-tier caching
```

## API

Auth is email/password via better-auth (`/api/auth/*`).

Graph query (requires auth):

```
GET /api/v1/graphs?num_props=3&max_height=5&compact=false
```

Returns nodes, edges with throw heights, and counts. Responses use ETags and a 3-tier cache in the engine. Common graphs are precomputed on startup.

## Code quality

Pre-commit hooks (via lefthook) auto-format and lint staged files.
Run `bun run lint` and `bun run format:check` manually, or let CI catch it.

## License

[AGPL-3.0](LICENSE)
