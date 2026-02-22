FROM oven/bun:alpine AS builder

WORKDIR /app

COPY package.json package.json
COPY bun.lock bun.lock

RUN bun install --frozen-lockfile

COPY ./src ./src
COPY ./drizzle ./drizzle

ENV NODE_ENV=production

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--outfile server \
	src/index.ts

FROM alpine:3.21
RUN apk add --no-cache libstdc++ libgcc

WORKDIR /app

COPY --from=builder /app/server server
COPY --from=builder /app/drizzle ./drizzle

ENV NODE_ENV=production

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1
CMD ["./server"]
