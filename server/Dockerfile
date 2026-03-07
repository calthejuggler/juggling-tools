ARG BUN_VERSION=1.3.10
FROM oven/bun:${BUN_VERSION}-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json ./server/
COPY web/package.json ./web/
COPY packages/simulator/core/package.json ./packages/simulator/core/
COPY packages/simulator/react/package.json ./packages/simulator/react/

RUN bun install --frozen-lockfile --ignore-scripts

COPY server/src ./server/src
COPY server/drizzle ./server/drizzle

ENV NODE_ENV=production

RUN cd server && bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--outfile server \
	src/index.ts

FROM alpine:3.21
RUN apk add --no-cache libstdc++ libgcc

WORKDIR /app

COPY --from=builder /app/server/server server
COPY --from=builder /app/server/drizzle ./drizzle

ENV NODE_ENV=production

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1
CMD ["./server"]
