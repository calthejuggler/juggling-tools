import dagre from "dagre";

import type { ExpandedGraphResponse, GraphApiResponse, GraphEdge, GraphNode } from "./graph-types";

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;

function toBinaryLabel(n: number, maxHeight: number, reversed: boolean): string {
  const binary = n.toString(2).padStart(maxHeight, "0");
  return reversed ? binary.split("").reverse().join("") : binary;
}

function expandCompactResponse(data: GraphApiResponse, reversed: boolean): ExpandedGraphResponse {
  const { max_height, nodes, edges, ground_state, ...rest } = data;
  return {
    ...rest,
    max_height,
    nodes: nodes.map((n) => toBinaryLabel(n, max_height, reversed)),
    edges: edges.map((e) => ({
      from: toBinaryLabel(e.from, max_height, reversed),
      to: toBinaryLabel(e.to, max_height, reversed),
      throw_height: e.throw_height,
    })),
    ground_state: toBinaryLabel(ground_state, max_height, reversed),
  };
}

export function computeGraphLayout(
  data: GraphApiResponse,
  reversed: boolean,
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const expanded = expandCompactResponse(data, reversed);
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB" });
  g.setDefaultEdgeLabel(() => ({}));

  const baseId = expanded.ground_state;

  for (const node of expanded.nodes) {
    g.setNode(node, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of expanded.edges) {
    g.setEdge(edge.from, edge.to);
  }

  dagre.layout(g);

  const nodes: GraphNode[] = expanded.nodes.map((id) => {
    const pos = g.node(id);
    return {
      id,
      type: "graphNode",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { label: id, isBase: id === baseId },
    };
  });

  const edges: GraphEdge[] = expanded.edges.map((edge) => ({
    id: `e-${edge.from}-${edge.to}-${edge.throw_height}`,
    source: edge.from,
    target: edge.to,
    label: String(edge.throw_height),
  }));

  return { nodes, edges };
}
