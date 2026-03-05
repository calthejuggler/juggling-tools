import { rateLimit } from "elysia-rate-limit";

import { jsonError } from "./json-error";

function createRateLimit(max: number) {
  return rateLimit({
    duration: 60_000,
    max,
    scoping: "scoped",
    headers: true,
    generator: (request, server) =>
      server?.requestIP(request)?.address ?? request.headers.get("x-forwarded-for") ?? "unknown",
    errorResponse: jsonError(429, "Too many requests, please try again later"),
  });
}

export const graphRateLimit = createRateLimit(30);
export const contactRateLimit = createRateLimit(5);
