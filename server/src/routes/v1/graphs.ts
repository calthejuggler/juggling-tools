import { Elysia, t } from "elysia";

import { loggingPlugin } from "../../lib/logging";
import { graphRateLimit } from "../../lib/rate-limit";
import { ErrorResponse, GraphResponse } from "../../lib/schemas";

const ENGINE_URL = Bun.env.ENGINE_URL ?? "http://localhost:8000";
const ENGINE_API_KEY = Bun.env.ENGINE_API_KEY ?? "";
const SCHEMA_VERSION = Bun.env.SCHEMA_VERSION ?? "1";

const graphQuerySchema = t.Object({
  num_props: t.Integer({
    minimum: 1,
    maximum: 32,
    description: "Number of props (balls) in the juggling pattern",
    examples: [3],
  }),
  max_height: t.Integer({
    minimum: 1,
    maximum: 32,
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

export const graphsRoute = new Elysia()
  .use(graphRateLimit)
  .use(loggingPlugin)
  .get(
    "/graphs",
    async ({ query, set, headers, wideEvent }) => {
      if (wideEvent) {
        wideEvent.num_props = query.num_props;
        wideEvent.max_height = query.max_height;
        wideEvent.compact = query.compact ?? false;
        wideEvent.reversed = query.reversed ?? false;
      }

      if (query.max_height < query.num_props) {
        set.status = 400;
        if (wideEvent) wideEvent.error_message = "max_height must be >= num_props";
        return new Response(JSON.stringify({ error: "max_height must be >= num_props" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const etag = `"v${SCHEMA_VERSION}-${query.num_props}-${query.max_height}-${query.compact ?? false}-${query.reversed ?? false}"`;

      if (headers["if-none-match"] === etag) {
        set.status = 304;
        if (wideEvent) wideEvent.cache_hit = "client";
        return new Response(null, { status: 304 });
      }

      const params = new URLSearchParams({
        num_props: String(query.num_props),
        max_height: String(query.max_height),
        compact: String(query.compact ?? false),
        reversed: String(query.reversed ?? false),
      });

      let engineRes: Response;
      try {
        engineRes = await fetch(`${ENGINE_URL}/v1/graphs?${params}`, {
          headers: { "X-API-Key": ENGINE_API_KEY },
        });
      } catch {
        set.status = 503;
        if (wideEvent) wideEvent.error_message = "Engine unavailable";
        return new Response(JSON.stringify({ error: "Engine unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (wideEvent) wideEvent.engine_status = engineRes.status;

      if (!engineRes.ok) {
        set.status = engineRes.status;
        if (wideEvent) wideEvent.error_message = `Engine returned ${engineRes.status}`;
        return new Response(await engineRes.text(), {
          status: engineRes.status,
          headers: { "Content-Type": "text/plain" },
        });
      }

      return new Response(engineRes.body, {
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
        304: t.Void({ description: "Not Modified — client cache is still valid" }),
        400: ErrorResponse,
        429: ErrorResponse,
        503: ErrorResponse,
      },
      detail: {
        summary: "Compute juggling graph",
        description:
          "Computes the siteswap state graph for the given parameters. " +
          "Responses include ETag headers for client-side caching — send If-None-Match to receive 304. " +
          "Rate limited to 30 requests per minute.",
        tags: ["Graphs v1"],
      },
    },
  );
