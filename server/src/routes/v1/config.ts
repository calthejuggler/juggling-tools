import { Elysia } from "elysia";

import { MAX_MAX_HEIGHT } from "../../lib/constants";

export const configRoute = new Elysia().get(
  "/config",
  () => ({
    max_max_height: MAX_MAX_HEIGHT,
  }),
  {
    detail: {
      summary: "Get server configuration",
      description:
        "Returns the server's configuration including the maximum allowed height based on STATE_SIZE.",
      tags: ["Config v1"],
    },
  },
);
