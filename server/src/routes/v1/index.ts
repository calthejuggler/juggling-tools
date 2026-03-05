import { Elysia } from "elysia";

import { adminRoutes } from "./admin";
import { configRoute } from "./config";
import { contactRoute } from "./contact";
import { onboardingRoute } from "./onboarding";
import { stateNotationRoutes } from "./state-notation";

export const v1 = new Elysia({ prefix: "/v1" })
  .use(stateNotationRoutes)
  .use(configRoute)
  .use(adminRoutes)
  .use(onboardingRoute)
  .use(contactRoute);
