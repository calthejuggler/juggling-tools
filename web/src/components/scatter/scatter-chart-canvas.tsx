import type { UseFormReturn } from "react-hook-form";

import { AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { GraphsValues } from "@/lib/schemas";
import type { TableApiResponse } from "@/lib/table-types";
import type { ViewType } from "@/lib/view-types";

import { QueryForm } from "../query-form";
import { ScatterChartView } from "./scatter-chart-view";

import { m } from "@/paraglide/messages.js";

interface ScatterChartCanvasProps {
  data: TableApiResponse | undefined;
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
}

export function ScatterChartCanvas({
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
}: ScatterChartCanvasProps) {
  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-2 md:flex-row md:gap-4 md:overflow-hidden md:p-4">
      <div className="shrink-0">
        <Card className="w-full shadow-lg md:w-80">
          <CardContent className="space-y-3 p-3 md:pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{m.query_label()}</span>
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </div>
            <QueryForm
              form={form}
              onSubmit={onSubmit}
              onFieldChange={onFieldChange}
              reversed={reversed}
              onReversedChange={onReversedChange}
              abbreviated={abbreviated}
              onAbbreviatedChange={onAbbreviatedChange}
              isFetching={isFetching}
              error={error}
              view={view}
              onViewChange={onViewChange}
            />
          </CardContent>
        </Card>
      </div>
      <div className="min-h-[300px] min-w-0 flex-1">
        {data ? (
          <Card className="h-full min-h-0 gap-0 overflow-hidden border-0 py-0">
            <CardContent className="h-full min-h-0 overflow-auto px-0">
              <ScatterChartView data={data} reversed={reversed} abbreviated={abbreviated} />
            </CardContent>
          </Card>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="text-destructive h-8 w-8" />
              <p className="text-destructive text-lg">{m.scatter_failed_to_load()}</p>
              <p className="text-muted-foreground text-sm">{error.message}</p>
            </div>
          </div>
        ) : isFetching ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-lg">{m.scatter_loading()}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
