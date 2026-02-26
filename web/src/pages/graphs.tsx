import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { GraphCanvas } from "@/components/graph/graph-canvas";
import { ScatterChartCanvas } from "@/components/scatter/scatter-chart-canvas";
import { StateTableCanvas } from "@/components/table/state-table-canvas";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { graphsSchema, type GraphsValues } from "@/lib/schemas";
import type { ViewType } from "@/lib/view-types";
import { useGraphQuery } from "@/queries/graphs";
import { useTableQuery } from "@/queries/table";
import { Route } from "@/routes/_authed/index";

export function GraphsPage() {
  const { num_props, max_height, view } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [reversed, setReversed] = useState(
    () => localStorage.getItem("juggling-tools-reversed") === "true",
  );

  const handleReversedChange = useCallback((checked: boolean) => {
    setReversed(checked);
    localStorage.setItem("juggling-tools-reversed", String(checked));
  }, []);

  const submitted: GraphsValues = { num_props, max_height };

  const form = useForm<GraphsValues>({
    resolver: zodResolver(graphsSchema),
    defaultValues: submitted,
    mode: "onChange",
  });

  const {
    data: graphData,
    error: graphError,
    isFetching: graphFetching,
  } = useGraphQuery(submitted, view === "graph");
  const {
    data: tableData,
    error: tableError,
    isFetching: tableFetching,
  } = useTableQuery(submitted, view === "table" || view === "scatter");

  const navigateToSearch = useCallback(
    (values: GraphsValues) => {
      navigate({ search: (prev) => ({ ...prev, ...values }), replace: true });
    },
    [navigate],
  );

  const debouncedNavigate = useDebouncedCallback(navigateToSearch, 400);

  async function onFieldChange() {
    const isValid = await form.trigger();
    if (isValid) {
      debouncedNavigate(form.getValues());
    }
  }

  function onSubmit(values: GraphsValues) {
    navigate({ search: (prev) => ({ ...prev, ...values }), replace: true });
  }

  const handleViewChange = useCallback(
    (newView: ViewType) => {
      navigate({ search: (prev) => ({ ...prev, view: newView }), replace: true });
    },
    [navigate],
  );

  return (
    <div className="h-full w-full">
      {view === "graph" ? (
        <GraphCanvas
          data={graphData}
          reversed={reversed}
          onReversedChange={handleReversedChange}
          form={form}
          onSubmit={onSubmit}
          onFieldChange={onFieldChange}
          isFetching={graphFetching}
          error={graphError}
          view={view}
          onViewChange={handleViewChange}
        />
      ) : view === "scatter" ? (
        <ScatterChartCanvas
          data={tableData}
          reversed={reversed}
          onReversedChange={handleReversedChange}
          form={form}
          onSubmit={onSubmit}
          onFieldChange={onFieldChange}
          isFetching={tableFetching}
          error={tableError}
          view={view}
          onViewChange={handleViewChange}
        />
      ) : (
        <StateTableCanvas
          data={tableData}
          reversed={reversed}
          onReversedChange={handleReversedChange}
          form={form}
          onSubmit={onSubmit}
          onFieldChange={onFieldChange}
          isFetching={tableFetching}
          error={tableError}
          view={view}
          onViewChange={handleViewChange}
        />
      )}
    </div>
  );
}
