import dagre from "dagre";

import { toAbbreviatedLabel, toBinaryLabel } from "./binary-label";
import type { ExpandedGraphResponse, GraphApiResponse, GraphEdge, GraphNode } from "./graph-types";

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;
export const SIMPLIFIED_THRESHOLD = 200;

export function expandCompactResponse(
  data: GraphApiResponse,
  reversed: boolean,
  abbreviated: boolean,
): ExpandedGraphResponse {
  const { max_height, nodes, edges, ground_state, ...rest } = data;
  const label = (n: number) =>
    abbreviated ? toAbbreviatedLabel(n, max_height) : toBinaryLabel(n, max_height, reversed);
  return {
    ...rest,
    max_height,
    nodes: nodes.map(label),
    edges: edges.map((e) => ({
      from: label(e.from),
      to: label(e.to),
      throw_height: e.throw_height,
    })),
    ground_state: label(ground_state),
  };
}

export function buildDagreGraph(expanded: ExpandedGraphResponse): dagre.graphlib.Graph {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB" });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of expanded.nodes) {
    g.setNode(node, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of expanded.edges) {
    g.setEdge(edge.from, edge.to);
  }

  return g;
}

export function runDagreLayout(g: dagre.graphlib.Graph): void {
  dagre.layout(g);
}

export function extractNodes(
  g: dagre.graphlib.Graph,
  expanded: ExpandedGraphResponse,
  baseId: string,
): GraphNode[] {
  return expanded.nodes.map((id) => {
    const pos = g.node(id);
    return {
      id,
      type: "graphNode",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { label: id, isBase: id === baseId },
    };
  });
}

export function extractEdges(expanded: ExpandedGraphResponse, simplified: boolean): GraphEdge[] {
  return expanded.edges.map((edge) => ({
    id: `e-${edge.from}-${edge.to}-${edge.throw_height}`,
    type: simplified ? "simplifiedEdge" : "graphEdge",
    source: edge.from,
    target: edge.to,
    ...(simplified ? {} : { label: String(edge.throw_height) }),
  }));
}

/** Synchronous all-in-one layout for small/builder graphs that don't need progress reporting. */
export function computeGraphLayout(
  data: GraphApiResponse,
  reversed: boolean,
  abbreviated: boolean,
): { nodes: GraphNode[]; edges: GraphEdge[]; simplified: boolean } {
  const simplified = data.num_nodes > SIMPLIFIED_THRESHOLD;
  const expanded = expandCompactResponse(data, reversed, abbreviated);
  const g = buildDagreGraph(expanded);
  runDagreLayout(g);
  const nodes = extractNodes(g, expanded, expanded.ground_state);
  const edges = extractEdges(expanded, simplified);
  return { nodes, edges, simplified };
}
