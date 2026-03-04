FROM rust:1.93-alpine AS chef
RUN apk add --no-cache musl-dev xz && \
    wget -qO- https://github.com/LukeMathWalker/cargo-chef/releases/latest/download/cargo-chef-x86_64-unknown-linux-musl.tar.xz \
    | tar xJ -C /usr/local/cargo/bin/ --strip-components=1
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
ARG STATE_SIZE=u32
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN if [ "$STATE_SIZE" != "u32" ]; then \
      cargo build --release --features "state-${STATE_SIZE}"; \
    else \
      cargo build --release; \
    fi

FROM alpine:3.21
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/target/release/engine .
RUN mkdir -p /app/cache && chown app:app /app/cache
USER app
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8000/v1/health || exit 1
CMD ["./engine"]
