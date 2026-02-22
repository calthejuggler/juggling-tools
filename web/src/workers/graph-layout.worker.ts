import { computeGraphLayout } from "@/lib/graph-layout";
import type { GraphApiResponse } from "@/lib/graph-types";

export interface LayoutRequest {
  id: number;
  data: GraphApiResponse;
  reversed: boolean;
}

export interface LayoutResponse {
  id: number;
  layout: ReturnType<typeof computeGraphLayout>;
}

self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { id, data, reversed } = event.data;
  const layout = computeGraphLayout(data, reversed);
  self.postMessage({ id, layout } satisfies LayoutResponse);
};
