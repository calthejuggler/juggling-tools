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

export const TableResponse = t.Object(
  {
    states: t.Array(t.Union([t.String(), t.Integer()])),
    cells: t.Array(t.Array(t.Union([t.Integer(), t.Null()]))),
    ground_state: t.Union([t.String(), t.Integer()]),
    num_states: t.Integer(),
    max_height: t.Integer(),
    num_props: t.Integer(),
  },
  { description: "State transition table result" },
);

const ThrowItem = t.Object({
  height: t.Integer(),
  destination: t.Union([t.String(), t.Integer()]),
});

export const ThrowsResponse = t.Object(
  {
    throws: t.Array(ThrowItem),
    state: t.Union([t.String(), t.Integer()]),
    max_height: t.Integer(),
    num_throws: t.Integer(),
  },
  { description: "Throws computation result" },
);
