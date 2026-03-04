import { rateLimit } from "elysia-rate-limit";

import { jsonError } from "./json-error";

export const graphRateLimit = rateLimit({
  duration: 60_000,
  max: 30,
  scoping: "scoped",
  headers: true,
  generator: (request, server) =>
    server?.requestIP(request)?.address ?? request.headers.get("x-forwarded-for") ?? "unknown",
  errorResponse: jsonError(429, "Too many requests, please try again later"),
});
