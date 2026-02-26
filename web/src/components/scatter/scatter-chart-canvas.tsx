import type { UseFormReturn } from "react-hook-form";

import { Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { GraphsValues } from "@/lib/schemas";
import type { TableApiResponse } from "@/lib/table-types";
import type { ViewType } from "@/lib/view-types";

import { QueryForm } from "../query-form";
import { ScatterChartView } from "./scatter-chart-view";

interface ScatterChartCanvasProps {
  data: TableApiResponse | undefined;
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

export function ScatterChartCanvas({
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
}: ScatterChartCanvasProps) {
  return (
    <div className="flex h-full gap-4 p-4">
      <div className="shrink-0">
        <Card className="w-72 shadow-lg">
          <CardContent className="pt-4">
            <QueryForm
              form={form}
              onSubmit={onSubmit}
              onFieldChange={onFieldChange}
              reversed={reversed}
              onReversedChange={onReversedChange}
              isFetching={isFetching}
              error={error}
              view={view}
              onViewChange={onViewChange}
            />
          </CardContent>
        </Card>
      </div>
      <div className="min-w-0 flex-1">
        {data ? (
          <Card className="h-full min-h-0 gap-0 overflow-hidden border-0 py-0">
            <CardContent className="h-full min-h-0 overflow-auto px-0">
              <ScatterChartView data={data} reversed={reversed} />
            </CardContent>
          </Card>
        ) : isFetching ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-lg">Loading scatter chart...</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
