import { lazy, Suspense, useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouteContext, useRouter } from "@tanstack/react-router";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { API_URL } from "@/lib/api";
import { graphsSchema, type GraphsValues } from "@/lib/schemas";
import type { ViewType } from "@/lib/view-types";
import { useGraphQuery } from "@/queries/graphs";
import { useTableQuery } from "@/queries/table";
import { Route } from "@/routes/_authed/index";

const GraphCanvas = lazy(() =>
  import("@/components/graph/graph-canvas").then((m) => ({
    default: m.GraphCanvas,
  })),
);
const ScatterChartCanvas = lazy(() =>
  import("@/components/scatter/scatter-chart-canvas").then((m) => ({
    default: m.ScatterChartCanvas,
  })),
);
const StateTableCanvas = lazy(() =>
  import("@/components/table/state-table-canvas").then((m) => ({
    default: m.StateTableCanvas,
  })),
);
const StateGraphWizard = lazy(() =>
  import("@/components/onboarding/state-graph-wizard").then((m) => ({
    default: m.StateGraphWizard,
  })),
);

export function GraphsPage() {
  const { num_props, max_height, view } = Route.useSearch();
  const { session } = useRouteContext({ from: "/_authed" });
  const router = useRouter();
  const navigate = Route.useNavigate();

  const [reversed, setReversed] = useState(
    () => localStorage.getItem("juggling-tools-reversed") === "true",
  );

  const handleReversedChange = useCallback((checked: boolean) => {
    setReversed(checked);
    localStorage.setItem("juggling-tools-reversed", String(checked));
  }, []);

  const [abbreviated, setAbbreviated] = useState(
    () => localStorage.getItem("juggling-tools-abbreviated") === "true",
  );

  const handleAbbreviatedChange = useCallback((checked: boolean) => {
    setAbbreviated(checked);
    localStorage.setItem("juggling-tools-abbreviated", String(checked));
  }, []);

  const submitted: GraphsValues = { num_props, max_height };

  const form = useForm<GraphsValues>({
    resolver: zodResolver(graphsSchema()),
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

  const isOnboardingComplete = !!session?.user?.stateGraphOnboardingCompleteAt;
  const [wizardOpen, setWizardOpen] = useState(!isOnboardingComplete);

  const handleWizardComplete = useCallback(async () => {
    setWizardOpen(false);
    try {
      await fetch(`${API_URL}/api/v1/onboarding/state-graph/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      await router.invalidate();
    } catch {
      // Non-critical, wizard will just show again next visit
    }
  }, [router]);

  const handleHelpClick = useCallback(() => {
    setWizardOpen(true);
  }, []);

  return (
    <div className="h-full w-full">
      <Suspense>
        <StateGraphWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onComplete={handleWizardComplete}
        />
      </Suspense>
      <Suspense>
        {view === "graph" ? (
          <GraphCanvas
            data={graphData}
            reversed={reversed}
            onReversedChange={handleReversedChange}
            abbreviated={abbreviated}
            onAbbreviatedChange={handleAbbreviatedChange}
            form={form}
            onSubmit={onSubmit}
            onFieldChange={onFieldChange}
            isFetching={graphFetching}
            error={graphError}
            view={view}
            onViewChange={handleViewChange}
            onHelpClick={handleHelpClick}
          />
        ) : view === "scatter" ? (
          <ScatterChartCanvas
            data={tableData}
            reversed={reversed}
            onReversedChange={handleReversedChange}
            abbreviated={abbreviated}
            onAbbreviatedChange={handleAbbreviatedChange}
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
            abbreviated={abbreviated}
            onAbbreviatedChange={handleAbbreviatedChange}
            form={form}
            onSubmit={onSubmit}
            onFieldChange={onFieldChange}
            isFetching={tableFetching}
            error={tableError}
            view={view}
            onViewChange={handleViewChange}
          />
        )}
      </Suspense>
    </div>
  );
}
