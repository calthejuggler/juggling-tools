import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  Bun.env.DATABASE_URL ??
  `postgresql://${Bun.env.POSTGRES_USER}:${Bun.env.POSTGRES_PASSWORD}@${Bun.env.DB_HOST ?? "localhost"}:5432/${Bun.env.POSTGRES_DB}`;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
