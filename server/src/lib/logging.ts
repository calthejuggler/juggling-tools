import { Elysia } from "elysia";
import { logger } from "./logger";

export type WideEvent = {
  num_balls?: number;
  max_height?: number;
  compact?: boolean;
  cache_hit?: string;
  engine_status?: number;
  error_code?: string;
  error_message?: string;
};

export const loggingPlugin = new Elysia({ name: "logging" })
  .derive({ as: "global" }, ({ request }) => {
    const wideEvent: WideEvent = {};
    const url = new URL(request.url);
    return {
      wideEvent,
      requestContext: {
        requestId: crypto.randomUUID(),
        method: request.method,
        path: url.pathname,
        userAgent: request.headers.get("user-agent") ?? undefined,
        startTime: performance.now(),
      },
    };
  })
  .onError({ as: "global" }, ({ wideEvent, error, code }) => {
    wideEvent.error_code = String(code);
    wideEvent.error_message = "message" in error ? String(error.message) : String(error);
  })
  .onAfterResponse({ as: "global" }, ({ wideEvent, requestContext, set }) => {
    const durationMs = performance.now() - requestContext.startTime;
    const status = typeof set.status === "number" ? set.status : 200;

    const fields: Record<string, unknown> = {
      request_id: requestContext.requestId,
      method: requestContext.method,
      path: requestContext.path,
      user_agent: requestContext.userAgent,
      status,
      duration_ms: Math.round(durationMs * 100) / 100,
      ...wideEvent,
    };

    if (status >= 400) {
      logger.error(fields);
    } else {
      logger.info(fields);
    }
  });
