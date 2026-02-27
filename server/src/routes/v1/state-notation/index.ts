import { Elysia } from "elysia";

import { graphRoute } from "./graph";
import { tableRoute } from "./table";
import { throwsRoute } from "./throws";

export const stateNotationRoutes = new Elysia({ prefix: "/state-notation" })
  .use(graphRoute)
  .use(tableRoute)
  .use(throwsRoute);
