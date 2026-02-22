import { Elysia } from "elysia";

import { graphsRoute } from "./graphs";

export const v1 = new Elysia({ prefix: "/v1" }).use(graphsRoute);
