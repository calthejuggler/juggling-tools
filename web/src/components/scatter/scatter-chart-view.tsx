import { useMemo } from "react";

import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { toBinaryLabel } from "@/lib/binary-label";
import type { TableApiResponse } from "@/lib/table-types";

interface ScatterPoint {
  x: number;
  y: number;
  size: number;
  fromLabel: string;
  toLabel: string;
}

interface ScatterChartViewProps {
  data: TableApiResponse;
  reversed: boolean;
}

const chartConfig = {
  throw: {
    label: "Throw height",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ScatterPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <div className="grid gap-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">From</span>
          <span className="font-mono font-medium">{point.fromLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">To</span>
          <span className="font-mono font-medium">{point.toLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Throw</span>
          <span className="font-mono font-medium">{point.size}</span>
        </div>
      </div>
    </div>
  );
}

export function ScatterChartView({ data, reversed }: ScatterChartViewProps) {
  const labels = useMemo(
    () =>
      data.states.map((s) =>
        typeof s === "number" ? toBinaryLabel(s, data.max_height, reversed) : s,
      ),
    [data, reversed],
  );

  const points = useMemo(() => {
    const result: ScatterPoint[] = [];
    for (let fromIdx = 0; fromIdx < data.cells.length; fromIdx++) {
      const row = data.cells[fromIdx];
      for (let toIdx = 0; toIdx < row.length; toIdx++) {
        const value = row[toIdx];
        if (value != null) {
          result.push({
            x: fromIdx,
            y: toIdx,
            size: value,
            fromLabel: labels[fromIdx],
            toLabel: labels[toIdx],
          });
        }
      }
    }
    return result;
  }, [data.cells, labels]);

  const ticks = useMemo(() => labels.map((_, i) => i), [labels]);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="From"
          domain={[-0.5, labels.length - 0.5]}
          ticks={ticks}
          tickFormatter={(i: number) => labels[i] ?? ""}
          label={{ value: "Source state", position: "bottom", offset: 0 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="To"
          domain={[-0.5, labels.length - 0.5]}
          ticks={ticks}
          tickFormatter={(i: number) => labels[i] ?? ""}
          label={{ value: "Destination state", angle: -90, position: "left", offset: 0 }}
        />
        <ZAxis type="number" dataKey="size" range={[20, 200]} />
        <Tooltip content={<CustomTooltip />} />
        <Scatter data={points} fill="var(--color-throw)" />
      </ScatterChart>
    </ChartContainer>
  );
}
