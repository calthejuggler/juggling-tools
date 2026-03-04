import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { m } from "@/paraglide/messages.js";

// Graph data for 2 props, max height 3
const nodes = [
  { id: "011", cx: 60, cy: 90, ground: true },
  { id: "101", cx: 180, cy: 40, ground: false },
  { id: "110", cx: 180, cy: 140, ground: false },
] as const;

const edges = [
  { from: "011", to: "011", label: "2", d: "M48 68 Q 30 40 60 40 Q 90 40 72 68", lx: 60, ly: 36 },
  { from: "011", to: "101", label: "3", d: "M80 80 Q 120 90 158 56", lx: 128, ly: 88 },
  { from: "101", to: "011", label: "1", d: "M158 44 Q 120 34 82 76", lx: 108, ly: 44 },
  { from: "101", to: "110", label: "3", d: "M180 64 L180 116", lx: 192, ly: 94 },
  { from: "110", to: "011", label: "0", d: "M158 132 Q 120 120 82 100", lx: 108, ly: 104 },
] as const;

// 312 trace: 011 --3--> 101 --1--> 011 --2--> 011
const traceSteps = [
  { fromNode: "011", toNode: "101", edgeLabel: "3" },
  { fromNode: "101", toNode: "011", edgeLabel: "1" },
  { fromNode: "011", toNode: "011", edgeLabel: "2" },
] as const;

type TracePhase = "idle" | "tracing" | "done";

const STEP_DURATION = 800;
const PATTERN = "312";

export function WizardStepTheGraph() {
  const [tracePhase, setTracePhase] = useState<TracePhase>("idle");
  const [activeStep, setActiveStep] = useState(-1);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const startTrace = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setTracePhase("tracing");
    setActiveStep(0);

    for (let i = 1; i < traceSteps.length; i++) {
      timeoutsRef.current.push(setTimeout(() => setActiveStep(i), STEP_DURATION * i));
    }
    timeoutsRef.current.push(
      setTimeout(() => setTracePhase("done"), STEP_DURATION * traceSteps.length),
    );
  }, []);

  const replay = useCallback(() => {
    setTracePhase("idle");
    setActiveStep(-1);
  }, []);

  const isTracing = tracePhase === "tracing" || tracePhase === "done";

  const { highlightedNodes, highlightedEdges, activeNodeId } = useMemo(() => {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    if (isTracing) {
      for (let i = 0; i <= activeStep; i++) {
        const step = traceSteps[i];
        nodes.add(step.fromNode);
        nodes.add(step.toNode);
        edges.add(`${step.fromNode}-${step.toNode}-${step.edgeLabel}`);
      }
    }
    const active = isTracing
      ? traceSteps[Math.min(activeStep, traceSteps.length - 1)]?.toNode
      : undefined;
    return { highlightedNodes: nodes, highlightedEdges: edges, activeNodeId: active };
  }, [isTracing, activeStep]);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <h3 className="text-lg font-semibold">{m.onboarding_graph_title()}</h3>
      <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
        {m.onboarding_graph_desc({ pattern: PATTERN })}
      </p>
      <svg
        viewBox="0 0 280 180"
        className="text-foreground mt-2 h-auto w-72 max-w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <defs>
          <marker
            id="onboarding-arrow"
            markerWidth="6"
            markerHeight="5"
            refX="5"
            refY="2.5"
            orient="auto"
          >
            <polygon points="0 0, 6 2.5, 0 5" fill="currentColor" />
          </marker>
          <marker
            id="onboarding-arrow-hl"
            markerWidth="6"
            markerHeight="5"
            refX="5"
            refY="2.5"
            orient="auto"
          >
            <polygon points="0 0, 6 2.5, 0 5" className="fill-primary" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const edgeKey = `${edge.from}-${edge.to}-${edge.label}`;
          const highlighted = highlightedEdges.has(edgeKey);
          return (
            <g key={edgeKey}>
              <path
                d={edge.d}
                markerEnd={highlighted ? "url(#onboarding-arrow-hl)" : "url(#onboarding-arrow)"}
                className={cn("transition-all duration-500", highlighted ? "stroke-primary" : "")}
                strokeWidth={highlighted ? 3 : 1.5}
              />
              <text
                x={edge.lx}
                y={edge.ly}
                textAnchor="middle"
                fontSize="9"
                stroke="none"
                className={cn(
                  "transition-colors duration-500",
                  highlighted ? "fill-primary font-bold" : "fill-muted-foreground",
                )}
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const highlighted = highlightedNodes.has(node.id);
          const isActive = activeNodeId === node.id;
          const baseStroke = node.ground ? "stroke-success" : "stroke-primary";
          const baseFill = node.ground ? "fill-success/20" : "fill-primary/20";
          const baseText = node.ground ? "fill-success" : "fill-primary";
          return (
            <g key={node.id}>
              <circle
                cx={node.cx}
                cy={node.cy}
                r="24"
                className={cn(
                  "transition-all duration-500",
                  highlighted ? "fill-primary/30 stroke-primary" : `${baseFill} ${baseStroke}`,
                )}
                strokeWidth={highlighted ? 3 : 2}
              />
              {isActive && (
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="28"
                  fill="none"
                  className="stroke-primary"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${node.cx} ${node.cy}`}
                    to={`360 ${node.cx} ${node.cy}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <text
                x={node.cx}
                y={node.cy + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                stroke="none"
                className={cn(
                  "transition-colors duration-500",
                  highlighted ? "fill-primary" : baseText,
                )}
              >
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-muted-foreground text-xs italic">{m.onboarding_graph_props_note()}</p>
      <div className="flex gap-2">
        {tracePhase === "done" ? (
          <Button size="sm" variant="outline" onClick={replay}>
            <RotateCcw className="mr-1 h-3 w-3" />
            {m.onboarding_graph_replay_trace()}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={startTrace}
            disabled={tracePhase === "tracing"}
          >
            <Play className="mr-1 h-3 w-3" />
            {m.onboarding_graph_trace_pattern({ pattern: PATTERN })}
          </Button>
        )}
      </div>
    </div>
  );
}
