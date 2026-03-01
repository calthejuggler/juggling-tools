import { createLazyFileRoute } from "@tanstack/react-router";

import { BuilderPage } from "@/pages/builder";

export const Route = createLazyFileRoute("/_authed/builder")({
  component: BuilderPage,
});
