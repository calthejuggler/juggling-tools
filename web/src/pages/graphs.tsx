import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { GraphCanvas } from "@/components/graph/graph-canvas";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useGraphs } from "@/hooks/use-graphs";
import { graphsSchema, type GraphsValues } from "@/lib/schemas";
import { Route } from "@/routes/_authed/index";

export function GraphsPage() {
  const { num_props, max_height } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [reversed, setReversed] = useState(
    () => localStorage.getItem("jgraph-reversed") === "true",
  );

  const handleReversedChange = useCallback((checked: boolean) => {
    setReversed(checked);
    localStorage.setItem("jgraph-reversed", String(checked));
  }, []);

  const submitted: GraphsValues = { num_props, max_height };

  const form = useForm<GraphsValues>({
    resolver: zodResolver(graphsSchema),
    defaultValues: submitted,
    mode: "onChange",
  });

  const { data, error, isFetching } = useGraphs(submitted);

  const navigateToSearch = useCallback(
    (values: GraphsValues) => {
      navigate({ search: values, replace: true });
    },
    [navigate],
  );

  const debouncedNavigate = useDebouncedCallback(navigateToSearch, 400);

  function onFieldChange() {
    const values = form.getValues();
    const result = graphsSchema.safeParse(values);
    if (result.success) {
      debouncedNavigate(result.data);
    }
  }

  function onSubmit(values: GraphsValues) {
    navigate({ search: values, replace: true });
  }

  return (
    <div className="h-full w-full">
      <GraphCanvas
        data={data}
        reversed={reversed}
        onReversedChange={handleReversedChange}
        form={form}
        onSubmit={onSubmit}
        onFieldChange={onFieldChange}
        isFetching={isFetching}
        error={error}
      />
    </div>
  );
}
