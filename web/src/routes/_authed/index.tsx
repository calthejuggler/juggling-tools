import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MAX_MAX_HEIGHT } from "@/lib/schemas";
import { GraphsPage } from "@/pages/graphs";

const searchSchema = z.object({
  num_props: z.number().int().min(1).max(MAX_MAX_HEIGHT).optional().catch(undefined),
  max_height: z.number().int().min(1).max(MAX_MAX_HEIGHT).optional().catch(undefined),
  compact: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute("/_authed/")({
  component: GraphsPage,
  validateSearch: (search) => searchSchema.parse(search),
});
