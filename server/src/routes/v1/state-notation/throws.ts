import { Elysia, t } from "elysia";

import { MAX_MAX_HEIGHT, SCHEMA_VERSION } from "../../../lib/constants";
import { fetchEngine } from "../../../lib/engine";
import { jsonError } from "../../../lib/json-error";
import { loggingPlugin } from "../../../lib/logging";
import { graphRateLimit } from "../../../lib/rate-limit";
import { requireSession } from "../../../lib/require-auth";
import { ErrorResponse, ThrowsResponse } from "../../../lib/schemas";

const throwsQuerySchema = t.Object({
  state: t.Integer({
    minimum: 0,
    description: "The state bitmask integer",
    examples: [7],
  }),
  max_height: t.Integer({
    minimum: 1,
    maximum: MAX_MAX_HEIGHT,
    description: "Maximum throw height allowed",
    examples: [5],
  }),
  compact: t.Optional(
    t.Boolean({
      default: false,
      description:
        "When true, states are represented as integers (bitmask). When false, states are binary strings",
    }),
  ),
  reversed: t.Optional(
    t.Boolean({
      default: false,
      description:
        "When true, binary string states are displayed LSB-first (reversed). No effect when compact=true",
    }),
  ),
});

export const throwsRoute = new Elysia()
  .use(graphRateLimit)
  .use(loggingPlugin)
  .get(
    "/throws",
    async ({ query, set, headers, wideEvent, request, requestContext }) => {
      wideEvent.max_height = query.max_height;
      wideEvent.compact = query.compact ?? false;
      wideEvent.reversed = query.reversed ?? false;

      if (query.state >= 1 << query.max_height) {
        set.status = 400;
        const msg = "state bits exceed max_height";
        wideEvent.error_message = msg;
        return jsonError(400, msg);
      }

      const auth = await requireSession(request, wideEvent);
      if (!auth.ok) {
        set.status = 401;
        return auth.response;
      }

      const etag = `"throws-v${SCHEMA_VERSION}-${query.state}-${query.max_height}-${query.compact ?? false}-${query.reversed ?? false}"`;

      if (headers["if-none-match"] === etag) {
        set.status = 304;
        wideEvent.cache_hit = "client";
        return new Response(null, { status: 304 });
      }

      const params = new URLSearchParams({
        state: String(query.state),
        max_height: String(query.max_height),
        compact: String(query.compact ?? false),
        reversed: String(query.reversed ?? false),
      });

      const engine = await fetchEngine("throws", params, requestContext.requestId, wideEvent);
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
      query: throwsQuerySchema,
      response: {
        200: ThrowsResponse,
        304: t.Void({ description: "Not Modified: client cache is still valid" }),
        400: ErrorResponse,
        401: ErrorResponse,
        429: ErrorResponse,
        503: ErrorResponse,
      },
      detail: {
        summary: "Compute throws from state",
        description:
          "Computes all valid throws from the given state within max_height. " +
          "Responses include ETag headers for client-side caching. Send If-None-Match to receive 304. " +
          "Rate limited to 30 requests per minute.",
        tags: ["State Notation v1"],
      },
    },
  );
