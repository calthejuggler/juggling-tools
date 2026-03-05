import type { BuilderState } from "@/hooks/use-builder-reducer";

import type { GraphApiResponse } from "./graph-types";

export function builderStateToGraphData(
  state: BuilderState,
  maxHeight: number,
  numProps: number,
): GraphApiResponse {
  const nodes = Array.from(state.visitedStates);

  // Deduplicate edges: same from/to/throw only appears once
  const edgeMap = new Map<string, { from: number; to: number; throw_height: number }>();
  for (const step of state.steps) {
    const key = `${step.state}-${step.destination}-${step.throwHeight}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        from: step.state,
        to: step.destination,
        throw_height: step.throwHeight,
      });
    }
  }
  const edges = Array.from(edgeMap.values());

  return {
    nodes,
    edges,
    ground_state: state.groundState,
    num_nodes: nodes.length,
    num_edges: edges.length,
    max_height: maxHeight,
    num_props: numProps,
  };
}
