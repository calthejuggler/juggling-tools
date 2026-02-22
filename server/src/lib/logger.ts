type BaseFields = Record<string, unknown>;

export function createLogger(baseFields?: BaseFields) {
  const base: BaseFields = {
    service: "server",
    version: Bun.env.npm_package_version ?? "unknown",
    environment: Bun.env.NODE_ENV ?? "development",
    ...baseFields,
  };

  return {
    info(fields: Record<string, unknown>) {
      const line = JSON.stringify({ level: "info", ...base, ...fields, timestamp: new Date().toISOString() });
      process.stdout.write(line + "\n");
    },
    error(fields: Record<string, unknown>) {
      const line = JSON.stringify({ level: "error", ...base, ...fields, timestamp: new Date().toISOString() });
      process.stderr.write(line + "\n");
    },
  };
}

export const logger = createLogger();
