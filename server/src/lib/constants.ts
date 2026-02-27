const STATE_SIZE_TO_MAX: Record<string, number> = {
  u8: 8,
  u16: 16,
  u32: 32,
  u64: 64,
  u128: 128,
};

export const MAX_MAX_HEIGHT = STATE_SIZE_TO_MAX[Bun.env.STATE_SIZE ?? "u32"] ?? 32;
export const ENGINE_URL = Bun.env.ENGINE_URL ?? "http://localhost:8000";
export const ENGINE_API_KEY = Bun.env.ENGINE_API_KEY ?? "";
export const SCHEMA_VERSION = Bun.env.SCHEMA_VERSION ?? "1";
