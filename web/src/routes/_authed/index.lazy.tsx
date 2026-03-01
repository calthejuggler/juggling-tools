import { createLazyFileRoute } from "@tanstack/react-router";

import { GraphsPage } from "@/pages/graphs";

export const Route = createLazyFileRoute("/_authed/")({
  component: GraphsPage,
});
