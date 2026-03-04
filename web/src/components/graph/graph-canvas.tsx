import type { UseFormReturn } from "react-hook-form";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import { AlertCircle, HelpCircle, Info, Loader2 } from "lucide-react";

import { useIsDesktop } from "@/hooks/use-breakpoint";
import { PHASE_LABELS, useGraphLayout } from "@/hooks/use-graph-layout";
import { useTheme } from "@/hooks/use-theme";
import type { GraphApiResponse, GraphEdge, GraphNode } from "@/lib/graph-types";
import type { GraphsValues } from "@/lib/schemas";
import type { ViewType } from "@/lib/view-types";

import { QueryForm } from "../query-form";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { GraphDetailsPanel } from "./graph-details-panel";
import { graphEdgeTypes } from "./graph-edge";
import { graphNodeTypes } from "./graph-node";
import { GraphQueryPanel } from "./graph-query-panel";

import { m } from "@/paraglide/messages.js";

const FIT_VIEW_OPTIONS = { padding: 0.2 } as const;
const DEFAULT_EDGE_OPTIONS = { markerEnd: { type: MarkerType.ArrowClosed } } as const;
const EMPTY_NODES: GraphNode[] = [];
const EMPTY_EDGES: GraphEdge[] = [];

interface GraphCanvasProps {
  data: GraphApiResponse | undefined;
  reversed: boolean;
  onReversedChange: (checked: boolean) => void;
  abbreviated: boolean;
  onAbbreviatedChange: (checked: boolean) => void;
  form: UseFormReturn<GraphsValues>;
  onSubmit: (values: GraphsValues) => void;
  onFieldChange: () => void;
  isFetching: boolean;
  error: Error | null;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onHelpClick?: () => void;
}

export function GraphCanvas({
  data,
  reversed,
  onReversedChange,
  abbreviated,
  onAbbreviatedChange,
  form,
  onSubmit,
  onFieldChange,
  isFetching,
  error,
  view,
  onViewChange,
  onHelpClick,
}: GraphCanvasProps) {
  const { theme } = useTheme();
  const { layout, progress } = useGraphLayout(data, reversed, abbreviated);
  const isDesktop = useIsDesktop();

  const isLayoutPending = !!data && !layout;
  const isLoading = isFetching || isLayoutPending;
  const key = layout
    ? `${data!.num_props}-${data!.max_height}-${reversed}-${abbreviated}`
    : "empty";

  const queryFormProps = {
    form,
    onSubmit,
    onFieldChange,
    reversed,
    onReversedChange,
    abbreviated,
    onAbbreviatedChange,
    isFetching: isLoading,
    error,
    view,
    onViewChange,
    onHelpClick,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Mobile: query form + stats as top sections */}
      {!isDesktop && (
        <Card className="m-2">
          <CardContent className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{m.query_label()}</span>
              {onHelpClick && (
                <button
                  onClick={onHelpClick}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={m.onboarding_help()}
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <QueryForm {...queryFormProps} />
            {data && (
              <div className="text-muted-foreground mt-2 flex gap-4 text-sm">
                <span>
                  <span className="text-muted-foreground">{m.graph_states()}</span> {data.num_nodes}
                </span>
                <span>
                  <span className="text-muted-foreground">{m.graph_transitions()}</span>{" "}
                  {data.num_edges}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Graph */}
      <div className="min-h-0 flex-1">
        <ReactFlow
          key={key}
          defaultNodes={layout?.nodes ?? EMPTY_NODES}
          defaultEdges={layout?.edges ?? EMPTY_EDGES}
          nodeTypes={graphNodeTypes}
          edgeTypes={graphEdgeTypes}
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
          {/* Desktop: overlay panels */}
          {isDesktop && <GraphQueryPanel {...queryFormProps} />}
          {isDesktop && (
            <GraphDetailsPanel nodeCount={data?.num_nodes} edgeCount={data?.num_edges} />
          )}
          {!layout && !isLoading && error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="text-destructive h-8 w-8" />
                <p className="text-destructive text-lg">{m.graph_failed_to_load()}</p>
                <p className="text-muted-foreground text-sm">{error.message}</p>
              </div>
            </div>
          )}
          {!layout && isLoading && !error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                {isFetching ? (
                  <p className="text-muted-foreground text-lg">{m.graph_fetching()}</p>
                ) : progress ? (
                  <div className="flex w-48 flex-col items-center gap-2">
                    <p className="text-muted-foreground text-sm">{PHASE_LABELS[progress.phase]}</p>
                    <Progress
                      value={((progress.phaseIndex + 1) / progress.totalPhases) * 100}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-lg">{m.graph_computing_layout()}</p>
                )}
              </div>
            </div>
          )}
          {layout?.simplified && (
            <div className="absolute top-2 left-1/2 z-50 -translate-x-1/2">
              <div className="bg-muted text-muted-foreground flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs shadow-sm">
                <Info className="h-3.5 w-3.5" />
                {m.graph_edge_labels_hidden()}
              </div>
            </div>
          )}
          {layout && isLoading && (
            <div className="bg-background/50 pointer-events-none absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
