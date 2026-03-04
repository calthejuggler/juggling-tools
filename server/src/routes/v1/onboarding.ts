import { and, eq, isNull } from "drizzle-orm";
import { Elysia } from "elysia";

import { db } from "../../db";
import { users } from "../../db/schema/auth";
import { loggingPlugin } from "../../lib/logging";
import { graphRateLimit } from "../../lib/rate-limit";
import { requireSession } from "../../lib/require-auth";

export const onboardingRoute = new Elysia({ prefix: "/onboarding" })
  .use(graphRateLimit)
  .use(loggingPlugin)
  .post(
    "/state-graph/complete",
    async ({ request, set, wideEvent }) => {
      const auth = await requireSession(request, wideEvent);
      if (!auth.ok) {
        set.status = 401;
        return auth.response;
      }

      try {
        await db
          .update(users)
          .set({ stateGraphOnboardingCompleteAt: new Date() })
          .where(
            and(eq(users.id, auth.session.user.id), isNull(users.stateGraphOnboardingCompleteAt)),
          );
      } catch {
        set.status = 500;
        return { error: "Failed to update onboarding status" };
      }

      return { success: true };
    },
    {
      detail: {
        summary: "Complete state graph onboarding",
        description: "Marks the state graph onboarding wizard as completed for the current user.",
        tags: ["Onboarding v1"],
      },
    },
  );
