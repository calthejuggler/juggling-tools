import { Elysia, t } from "elysia";

import { MAX_MAX_HEIGHT, SCHEMA_VERSION } from "../../../lib/constants";
import { fetchEngine } from "../../../lib/engine";
import { jsonError } from "../../../lib/json-error";
import { loggingPlugin } from "../../../lib/logging";
import { graphRateLimit } from "../../../lib/rate-limit";
import { requireSession } from "../../../lib/require-auth";
import { ErrorResponse, GraphResponse } from "../../../lib/schemas";

const graphQuerySchema = t.Object({
  num_props: t.Integer({
    minimum: 1,
    maximum: MAX_MAX_HEIGHT,
    description: "Number of props (balls) in the juggling pattern",
    examples: [3],
  }),
  max_height: t.Integer({
    minimum: 1,
    maximum: MAX_MAX_HEIGHT,
    description: "Maximum throw height allowed. Must be >= num_props",
    examples: [5],
  }),
  compact: t.Optional(
    t.Boolean({
      default: false,
      description:
        "When true, nodes are represented as integers (bitmask). When false, nodes are binary strings",
    }),
  ),
  reversed: t.Optional(
    t.Boolean({
      default: false,
      description:
        "When true, binary string nodes are displayed LSB-first (reversed). No effect when compact=true",
    }),
  ),
});

export const graphRoute = new Elysia()
  .use(graphRateLimit)
  .use(loggingPlugin)
  .get(
    "/graph",
    async ({ query, set, headers, wideEvent, request, requestContext }) => {
      wideEvent.num_props = query.num_props;
      wideEvent.max_height = query.max_height;
      wideEvent.compact = query.compact ?? false;
      wideEvent.reversed = query.reversed ?? false;

      if (query.max_height < query.num_props) {
        set.status = 400;
        wideEvent.error_message = "max_height must be >= num_props";
        return jsonError(400, "max_height must be >= num_props");
      }

      const auth = await requireSession(request, wideEvent);
      if (!auth.ok) {
        set.status = 401;
        return auth.response;
      }

      const etag = `"v${SCHEMA_VERSION}-${query.num_props}-${query.max_height}-${query.compact ?? false}-${query.reversed ?? false}"`;

      if (headers["if-none-match"] === etag) {
        set.status = 304;
        wideEvent.cache_hit = "client";
        return new Response(null, { status: 304 });
      }

      const params = new URLSearchParams({
        num_props: String(query.num_props),
        max_height: String(query.max_height),
        compact: String(query.compact ?? false),
        reversed: String(query.reversed ?? false),
      });

      const engine = await fetchEngine("graph", params, requestContext.requestId, wideEvent);
      if (!engine.ok) {
        set.status = engine.response.status;
        return engine.response;
      }

      return new Response(engine.response.body, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, no-cache",
          ETag: etag,
        },
      });
    },
    {
      query: graphQuerySchema,
      response: {
        200: GraphResponse,
        304: t.Void({ description: "Not Modified: client cache is still valid" }),
        400: ErrorResponse,
        401: ErrorResponse,
        429: ErrorResponse,
        503: ErrorResponse,
      },
      detail: {
        summary: "Compute juggling graph",
        description:
          "Computes the siteswap state graph for the given parameters. " +
          "Responses include ETag headers for client-side caching. Send If-None-Match to receive 304. " +
          "Rate limited to 30 requests per minute.",
        tags: ["State Notation v1"],
      },
    },
  );
