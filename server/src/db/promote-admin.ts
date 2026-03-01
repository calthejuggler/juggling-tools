import { eq } from "drizzle-orm";

import { logger } from "../lib/logger";
import { db } from "./index";
import { users } from "./schema/auth";

export async function promoteAdmin() {
  const email = Bun.env.ADMIN_EMAIL;
  if (!email) return;

  const result = await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, email))
    .returning({ id: users.id, email: users.email });

  if (result.length > 0) {
    logger.info({ event: "admin_promoted", email });
  } else {
    logger.info({ event: "admin_promote_skipped", email, reason: "user_not_found" });
  }
}
