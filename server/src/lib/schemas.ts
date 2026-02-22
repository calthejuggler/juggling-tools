import { t } from "elysia";

export const ErrorResponse = t.Object({ error: t.String() }, { description: "Error response" });

const Edge = t.Object({
  from: t.Union([t.String(), t.Integer()]),
  to: t.Union([t.String(), t.Integer()]),
  throw_height: t.Integer(),
});

export const GraphResponse = t.Object(
  {
    nodes: t.Array(t.Union([t.String(), t.Integer()])),
    edges: t.Array(Edge),
    ground_state: t.Union([t.String(), t.Integer()]),
    num_nodes: t.Integer(),
    num_edges: t.Integer(),
    max_height: t.Integer(),
    num_props: t.Integer(),
  },
  { description: "Graph computation result" },
);
