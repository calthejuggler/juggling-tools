import { Elysia } from "elysia";
import { auth } from "./lib/auth";

const app = new Elysia()
  .mount(auth.handler)
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
