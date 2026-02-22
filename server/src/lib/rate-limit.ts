import { rateLimit } from "elysia-rate-limit";

export const graphRateLimit = rateLimit({
  duration: 60_000,
  max: 30,
  scoping: "scoped",
  headers: true,
  errorResponse: new Response(
    JSON.stringify({ error: "Too many requests, please try again later" }),
    {
      status: 429,
      headers: { "Content-Type": "application/json" },
    },
  ),
});
