import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.DB_HOST ?? "localhost"}:5432/${process.env.POSTGRES_DB}`;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: connectionString,
  },
});
