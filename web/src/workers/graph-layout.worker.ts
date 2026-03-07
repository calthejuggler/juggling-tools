import {
  buildDagreGraph,
  expandCompactResponse,
  extractEdges,
  extractNodes,
  runDagreLayout,
  SIMPLIFIED_THRESHOLD,
} from "@/lib/graph-layout";
import type { GraphApiResponse, GraphEdge, GraphNode } from "@/lib/graph-types";

interface LayoutRequest {
  id: number;
  data: GraphApiResponse;
  reversed: boolean;
  abbreviated: boolean;
}

export type LayoutPhase =
  | "expanding"
  | "building-graph"
  | "computing-layout"
  | "positioning"
  | "finalizing";

export type WorkerMessage =
  | {
      type: "progress";
      id: number;
      phase: LayoutPhase;
      phaseIndex: number;
      totalPhases: number;
    }
  | {
      type: "result";
      id: number;
      layout: { nodes: GraphNode[]; edges: GraphEdge[]; simplified: boolean };
    };

const TOTAL_PHASES = 5;

const yield_ = () => new Promise<void>((r) => setTimeout(r, 0));

function reportProgress(id: number, phase: LayoutPhase, phaseIndex: number) {
  self.postMessage({
    type: "progress",
    id,
    phase,
    phaseIndex,
    totalPhases: TOTAL_PHASES,
  } satisfies WorkerMessage);
}

self.onmessage = async (event: MessageEvent<LayoutRequest>) => {
  const { id, data, reversed, abbreviated } = event.data;
  const simplified = data.num_nodes > SIMPLIFIED_THRESHOLD;

  reportProgress(id, "expanding", 0);
  await yield_();
  const expanded = expandCompactResponse(data, reversed, abbreviated);

  reportProgress(id, "building-graph", 1);
  await yield_();
  const g = buildDagreGraph(expanded);

  reportProgress(id, "computing-layout", 2);
  await yield_();
  runDagreLayout(g);

  reportProgress(id, "positioning", 3);
  await yield_();
  const nodes = extractNodes(g, expanded, expanded.ground_state);

  reportProgress(id, "finalizing", 4);
  await yield_();
  const edges = extractEdges(expanded, simplified);

  self.postMessage({
    type: "result",
    id,
    layout: { nodes, edges, simplified },
  } satisfies WorkerMessage);
};
