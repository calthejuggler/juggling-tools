import type { Edge, Node } from "@xyflow/react";

export interface GraphApiEdge {
  from: number;
  to: number;
  throw_height: number;
}

export interface GraphApiResponse {
  nodes: number[];
  edges: GraphApiEdge[];
  ground_state: number;
  num_nodes: number;
  num_edges: number;
  max_height: number;
  num_props: number;
}

export interface ExpandedGraphEdge {
  from: string;
  to: string;
  throw_height: number;
}

export interface ExpandedGraphResponse {
  nodes: string[];
  edges: ExpandedGraphEdge[];
  ground_state: string;
  num_nodes: number;
  num_edges: number;
  max_height: number;
  num_props: number;
}

export interface GraphNodeData {
  label: string;
  isBase: boolean;
  [key: string]: unknown;
}

export type GraphNode = Node<GraphNodeData>;
export type GraphEdge = Edge;
