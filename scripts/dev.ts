import { existsSync } from "fs";
import { resolve } from "path";

import { Subprocess } from "bun";

const ROOT = resolve(import.meta.dir, "..");
const env = Bun.env;

const RESET = "\x1b[0m";
const COLORS: Record<string, string> = {
  web: "\x1b[36m",
  server: "\x1b[33m",
  engine: "\x1b[35m",
  infra: "\x1b[32m",
};

function log(tag: string, msg: string) {
  const color = COLORS[tag] ?? "";
  for (const line of msg.split("\n")) {
    console.log(`${color}[${tag}]${RESET} ${line}`);
  }
}

async function ensureDeps() {
  for (const dir of ["web", "server"]) {
    const nodeModules = resolve(ROOT, dir, "node_modules");
    if (!existsSync(nodeModules)) {
      log("infra", `Installing dependencies in ${dir}/...`);
      const proc = Bun.spawn(["bun", "install"], {
        cwd: resolve(ROOT, dir),
        stdout: "inherit",
        stderr: "inherit",
      });
      await proc.exited;
      if (proc.exitCode !== 0) {
        console.error(`Failed to install dependencies in ${dir}/`);
        process.exit(1);
      }
    }
  }
}

async function startInfra() {
  log("infra", "Starting db and redis...");
  const proc = Bun.spawn(["docker", "compose", "-f", "compose.dev.yml", "up", "-d"], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
    env,
  });
  await proc.exited;
  if (proc.exitCode !== 0) {
    console.error("Failed to start Docker infrastructure");
    process.exit(1);
  }
}

async function waitForHealthy(container: string, timeout = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const proc = Bun.spawn(
      ["docker", "inspect", "--format", "{{.State.Health.Status}}", container],
      { stdout: "pipe", stderr: "pipe" },
    );
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    if (output.trim() === "healthy") {
      log("infra", `${container} is healthy`);
      return;
    }
    await Bun.sleep(1000);
  }
  console.error(`Timed out waiting for ${container} to become healthy`);
  process.exit(1);
}

function pipeOutput(stream: ReadableStream<Uint8Array> | null, tag: string) {
  if (!stream) return;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        log(tag, line);
      }
    }
    if (buffer) log(tag, buffer);
  })();
}

function spawnApp(
  tag: string,
  cmd: string[],
  cwd: string,
  extraEnv: Record<string, string> = {},
): Subprocess {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...env, ...extraEnv },
  });
  pipeOutput(proc.stdout, tag);
  pipeOutput(proc.stderr, tag);
  return proc;
}

const procs: Subprocess[] = [];

async function main() {
  await ensureDeps();
  await startInfra();
  await Promise.all([waitForHealthy("jgraph-db"), waitForHealthy("jgraph-redis")]);

  log("infra", "Infrastructure ready. Starting apps...\n");

  procs.push(
    spawnApp("web", ["bun", "run", "dev"], resolve(ROOT, "web"), {
      VITE_API_URL: "http://localhost:3000",
    }),
  );

  procs.push(spawnApp("server", ["bun", "run", "dev"], resolve(ROOT, "server")));

  const cargoWatch = Bun.spawn(["which", "cargo-watch"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await cargoWatch.exited;
  const hasCargoWatch = cargoWatch.exitCode === 0;

  if (!hasCargoWatch) {
    log("engine", "cargo-watch not found — using `cargo run` (no auto-reload)");
    log("engine", "Install it with: cargo install cargo-watch");
  }

  const engineCmd = hasCargoWatch ? ["cargo", "watch", "-x", "run"] : ["cargo", "run"];

  procs.push(
    spawnApp("engine", engineCmd, resolve(ROOT, "engine"), {
      REDIS_URL: `redis://:${env.REDIS_PASSWORD}@localhost:6379`,
      CACHE_DIR: resolve(ROOT, "engine", ".cache"),
    }),
  );
}

function cleanup() {
  log("infra", "\nShutting down apps...");
  for (const proc of procs) {
    proc.kill();
  }
  log("infra", "Stopping Docker infra...");
  Bun.spawnSync(["docker", "compose", "-f", "compose.dev.yml", "down"], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

main().catch((err) => {
  console.error(err);
  cleanup();
});
