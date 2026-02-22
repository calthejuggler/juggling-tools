import { Elysia, t } from "elysia";
import type { WideEvent } from "../../lib/logging";
import { graphRateLimit } from "../../lib/rate-limit";

const ENGINE_URL = Bun.env.ENGINE_URL ?? "http://localhost:8000";
const ENGINE_API_KEY = Bun.env.ENGINE_API_KEY ?? "";

const graphQuerySchema = t.Object({
  num_props: t.Integer({ minimum: 1, maximum: 32 }),
  max_height: t.Integer({ minimum: 1, maximum: 32 }),
  compact: t.Optional(t.Boolean({ default: false })),
});

export const graphsRoute = new Elysia()
  .use(graphRateLimit)
  .get(
    "/graphs",
    async (ctx) => {
      const { query, set, headers } = ctx;
      const wideEvent = (ctx as unknown as { wideEvent: WideEvent }).wideEvent;

      if (wideEvent) {
        wideEvent.num_props = query.num_props;
        wideEvent.max_height = query.max_height;
        wideEvent.compact = query.compact ?? false;
      }

      if (query.max_height < query.num_props) {
        set.status = 400;
        if (wideEvent) wideEvent.error_message = "max_height must be >= num_props";
        return { error: "max_height must be >= num_props" };
      }

      const etag = `"${query.num_props}-${query.max_height}-${query.compact ?? false}"`;

      if (headers["if-none-match"] === etag) {
        set.status = 304;
        if (wideEvent) wideEvent.cache_hit = "client";
        return;
      }

      const params = new URLSearchParams({
        num_props: String(query.num_props),
        max_height: String(query.max_height),
        compact: String(query.compact ?? false),
      });

      let engineRes: Response;
      try {
        engineRes = await fetch(
          `${ENGINE_URL}/v1/graphs?${params}`,
          {
            headers: { "X-API-Key": ENGINE_API_KEY },
          },
        );
      } catch {
        set.status = 503;
        if (wideEvent) wideEvent.error_message = "Engine unavailable";
        return { error: "Engine unavailable" };
      }

      if (wideEvent) wideEvent.engine_status = engineRes.status;

      if (!engineRes.ok) {
        set.status = engineRes.status;
        if (wideEvent) wideEvent.error_message = `Engine returned ${engineRes.status}`;
        return engineRes.text();
      }

      return new Response(engineRes.body, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=31536000, immutable",
          ETag: etag,
        },
      });
    },
    { query: graphQuerySchema },
  );
