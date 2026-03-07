import { useSyncExternalStore } from "react";

import type { GraphApiResponse, GraphEdge, GraphNode } from "@/lib/graph-types";
import type { LayoutPhase, WorkerMessage } from "@/workers/graph-layout.worker";
import GraphLayoutWorker from "@/workers/graph-layout.worker?worker";

import { m } from "@/paraglide/messages.js";

interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  simplified: boolean;
}

interface LayoutProgress {
  phase: LayoutPhase;
  phaseIndex: number;
  totalPhases: number;
}

export const PHASE_LABELS: Record<LayoutPhase, string> = {
  expanding: m.graph_phase_expanding(),
  "building-graph": m.graph_phase_building(),
  "computing-layout": m.graph_phase_computing(),
  positioning: m.graph_phase_positioning(),
  finalizing: m.graph_phase_finalizing(),
};

const worker = new GraphLayoutWorker();
const listeners = new Set<() => void>();

interface LayoutSnapshot {
  id: number;
  layout: GraphLayout;
}

interface ProgressSnapshot {
  id: number;
  progress: LayoutProgress;
}

let layoutSnapshot: LayoutSnapshot | null = null;
let progressSnapshot: ProgressSnapshot | null = null;

let lastRequestedData: GraphApiResponse | undefined;
let lastRequestedReversed: boolean | undefined;
let lastRequestedAbbreviated: boolean | undefined;
let requestId = 0;
let requestStartTime = 0;

const PROGRESS_DELAY_MS = 200;

worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;
  if (msg.type === "progress") {
    if (Date.now() - requestStartTime > PROGRESS_DELAY_MS) {
      progressSnapshot = {
        id: msg.id,
        progress: {
          phase: msg.phase,
          phaseIndex: msg.phaseIndex,
          totalPhases: msg.totalPhases,
        },
      };
    }
  } else {
    layoutSnapshot = { id: msg.id, layout: msg.layout };
    progressSnapshot = null;
  }
  listeners.forEach((l) => l());
});

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getLayoutSnapshot() {
  return layoutSnapshot;
}

function getProgressSnapshot() {
  return progressSnapshot;
}

function requestLayout(data: GraphApiResponse, reversed: boolean, abbreviated: boolean): number {
  if (
    lastRequestedData === data &&
    lastRequestedReversed === reversed &&
    lastRequestedAbbreviated === abbreviated
  )
    return requestId;
  lastRequestedData = data;
  lastRequestedReversed = reversed;
  lastRequestedAbbreviated = abbreviated;
  requestId++;
  requestStartTime = Date.now();
  progressSnapshot = null;
  worker.postMessage({ id: requestId, data, reversed, abbreviated });
  return requestId;
}

export function useGraphLayout(
  data: GraphApiResponse | undefined,
  reversed: boolean,
  abbreviated: boolean,
): { layout: GraphLayout | null; progress: LayoutProgress | null } {
  const currentId = data ? requestLayout(data, reversed, abbreviated) : -1;
  const layoutResult = useSyncExternalStore(subscribe, getLayoutSnapshot);
  const progressResult = useSyncExternalStore(subscribe, getProgressSnapshot);

  const layout = layoutResult?.id === currentId ? layoutResult.layout : null;
  const progress = progressResult?.id === currentId ? progressResult.progress : null;

  return { layout, progress };
}
