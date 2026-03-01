import { Elysia } from "elysia";

const MIN_SIZE = 1024;

export const compressionPlugin = new Elysia({ name: "compression" }).onAfterHandle(
  { as: "global" },
  ({ request, response, set }) => {
    const accept = request.headers.get("accept-encoding") ?? "";
    if (!accept.includes("gzip")) return;

    const isJson =
      typeof response === "object" && response !== null && !(response instanceof Response);

    if (isJson) {
      const json = JSON.stringify(response);
      if (json.length < MIN_SIZE) return;

      const compressed = Bun.gzipSync(Buffer.from(json));
      set.headers["content-encoding"] = "gzip";
      set.headers["content-type"] = "application/json;charset=utf-8";
      return new Response(compressed);
    }

    if (typeof response === "string" && response.length >= MIN_SIZE) {
      const compressed = Bun.gzipSync(Buffer.from(response));
      set.headers["content-encoding"] = "gzip";
      return new Response(compressed);
    }
  },
);
