import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { UI_MAX_HEIGHT } from "@/lib/schemas";
import { GraphsPage } from "@/pages/graphs";

const searchSchema = z.object({
  num_props: z.number().int().min(1).max(UI_MAX_HEIGHT).catch(3),
  max_height: z.number().int().min(1).max(UI_MAX_HEIGHT).catch(5),
  view: z.enum(["graph", "table", "scatter"]).catch("graph"),
});

export const Route = createFileRoute("/_authed/")({
  component: GraphsPage,
  validateSearch: (search) => searchSchema.parse(search),
});
