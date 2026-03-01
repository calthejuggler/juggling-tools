import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  plugins: [admin({ defaultRole: "user" })],
  trustedOrigins: [Bun.env.CORS_ORIGIN ?? "http://localhost:5173"],
  trustedProxies: ["127.0.0.1", "::1", "172.16.0.0/12"],
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/forget-password": { window: 300, max: 3 },
      "/get-session": { window: 10, max: 30 },
    },
  },
});
