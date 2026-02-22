import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

import packageJson from "../package.json";
import { runMigrations } from "./db";
import { auth } from "./lib/auth";
import { logger } from "./lib/logger";
import { loggingPlugin } from "./lib/logging";
import { routes } from "./routes";

const main = async () => {
  try {
    await runMigrations();
    logger.info({ event: "migrations_applied" });
  } catch (err) {
    logger.error({ event: "migrations_failed", error: err });
    process.exit(1);
  }

  const app = new Elysia()
    .use(cors({ origin: Bun.env.CORS_ORIGIN ?? "http://localhost:5173", credentials: true }))
    .use(loggingPlugin)
    .use(
      openapi({
        documentation: {
          info: {
            title: "jgraph API",
            version: packageJson.version,
            description:
              "API for computing and visualizing juggling siteswap state graphs. " +
              "Provides graph computation via a Rust engine and user authentication via better-auth.",
          },
          tags: [
            {
              name: "Graphs v1",
              description: "Juggling graph computation endpoints",
            },
            {
              name: "Authentication",
              description: "User authentication endpoints (better-auth)",
            },
          ],
          paths: {
            "/api/auth/sign-up/email": {
              post: {
                tags: ["Authentication"],
                summary: "Sign up with email and password",
                description: "Rate limited to 3 requests per 60 seconds.",
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        required: ["name", "email", "password"],
                        properties: {
                          name: { type: "string" },
                          email: { type: "string", format: "email" },
                          password: { type: "string", minLength: 8 },
                        },
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "User created successfully",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            user: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                                email: { type: "string" },
                              },
                            },
                            session: { type: "object" },
                          },
                        },
                      },
                    },
                  },
                  "429": { description: "Rate limit exceeded" },
                },
              },
            },
            "/api/auth/sign-in/email": {
              post: {
                tags: ["Authentication"],
                summary: "Sign in with email and password",
                description: "Rate limited to 5 requests per 60 seconds.",
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        required: ["email", "password"],
                        properties: {
                          email: { type: "string", format: "email" },
                          password: { type: "string" },
                        },
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Authenticated successfully",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            user: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                                email: { type: "string" },
                              },
                            },
                            session: { type: "object" },
                          },
                        },
                      },
                    },
                  },
                  "401": { description: "Invalid credentials" },
                  "429": { description: "Rate limit exceeded" },
                },
              },
            },
            "/api/auth/get-session": {
              get: {
                tags: ["Authentication"],
                summary: "Get current session",
                description:
                  "Returns the current user session if authenticated. Rate limited to 30 requests per 10 seconds.",
                responses: {
                  "200": {
                    description: "Session details",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            user: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                                email: { type: "string" },
                              },
                            },
                            session: { type: "object" },
                          },
                        },
                      },
                    },
                  },
                  "401": { description: "Not authenticated" },
                  "429": { description: "Rate limit exceeded" },
                },
              },
            },
            "/api/auth/sign-out": {
              post: {
                tags: ["Authentication"],
                summary: "Sign out",
                description: "Invalidates the current session.",
                responses: {
                  "200": { description: "Signed out successfully" },
                },
              },
            },
          },
        },
        exclude: {
          paths: ["/"],
        },
      }),
    )
    .use(routes)
    .mount(auth.handler)
    .get("/", () => "Hello Elysia")
    .listen(3000);

  logger.info({
    event: "server_started",
    host: app.server?.hostname,
    port: app.server?.port,
  });
};

main();
