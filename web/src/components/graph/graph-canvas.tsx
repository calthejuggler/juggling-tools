import type { UseFormReturn } from "react-hook-form";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import { Loader2 } from "lucide-react";

import { useGraphLayout } from "@/hooks/use-graph-layout";
import { useTheme } from "@/hooks/use-theme";
import type { GraphApiResponse, GraphEdge, GraphNode } from "@/lib/graph-types";
import type { GraphsValues } from "@/lib/schemas";
import type { ViewType } from "@/lib/view-types";

import { GraphDetailsPanel } from "./graph-details-panel";
import { graphNodeTypes } from "./graph-node";
import { GraphQueryPanel } from "./graph-query-panel";

const FIT_VIEW_OPTIONS = { padding: 0.2 } as const;
const DEFAULT_EDGE_OPTIONS = { markerEnd: { type: MarkerType.ArrowClosed } } as const;
const EMPTY_NODES: GraphNode[] = [];
const EMPTY_EDGES: GraphEdge[] = [];

interface GraphCanvasProps {
  data: GraphApiResponse | undefined;
  reversed: boolean;
  onReversedChange: (checked: boolean) => void;
  form: UseFormReturn<GraphsValues>;
  onSubmit: (values: GraphsValues) => void;
  onFieldChange: () => void;
  isFetching: boolean;
  error: Error | null;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function GraphCanvas({
  data,
  reversed,
  onReversedChange,
  form,
  onSubmit,
  onFieldChange,
  isFetching,
  error,
  view,
  onViewChange,
}: GraphCanvasProps) {
  const { theme } = useTheme();
  const layout = useGraphLayout(data, reversed);

  const isLayoutPending = !!data && !layout;
  const isLoading = isFetching || isLayoutPending;
  const key = layout ? `${data!.num_props}-${data!.max_height}-${reversed}` : "empty";

  return (
    <ReactFlow
      key={key}
      defaultNodes={layout?.nodes ?? EMPTY_NODES}
      defaultEdges={layout?.edges ?? EMPTY_EDGES}
      nodeTypes={graphNodeTypes}
      nodesConnectable={false}
      edgesFocusable={false}
      nodesFocusable={false}
      elementsSelectable={false}
      defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      fitView
      fitViewOptions={FIT_VIEW_OPTIONS}
      colorMode={theme}
    >
      <Background variant={BackgroundVariant.Dots} />
      <Controls />
      {(data?.num_nodes ?? 0) > 30 && <MiniMap />}
      <GraphQueryPanel
        form={form}
        onSubmit={onSubmit}
        onFieldChange={onFieldChange}
        reversed={reversed}
        onReversedChange={onReversedChange}
        isFetching={isLoading}
        error={error}
        view={view}
        onViewChange={onViewChange}
      />
      <GraphDetailsPanel nodeCount={data?.num_nodes} edgeCount={data?.num_edges} />
      {!layout && isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-lg">Loading graph...</p>
          </div>
        </div>
      )}
      {layout && isLoading && (
        <div className="bg-background/50 pointer-events-none absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      )}
    </ReactFlow>
  );
}
