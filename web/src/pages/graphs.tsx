import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGraphs } from "@/hooks/use-graphs";
import { graphsSchema, type GraphsValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

export function GraphsPage() {
  const [submitted, setSubmitted] = useState<GraphsValues | null>(null);

  const form = useForm<GraphsValues>({
    resolver: zodResolver(graphsSchema),
    defaultValues: { num_props: 3, max_height: 5, compact: false },
  });

  const { data, error, isFetching } = useGraphs(submitted);

  function onSubmit(values: GraphsValues) {
    setSubmitted(values);
  }

  const nodeCount = data?.nodes?.length;
  const edgeCount = data?.edges?.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Query Graphs</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="num_props"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="num_props">
                      Number of props
                    </FieldLabel>
                    <Input
                      id="num_props"
                      type="number"
                      min={1}
                      max={10}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="max_height"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="max_height">Max height</FieldLabel>
                    <Input
                      id="max_height"
                      type="number"
                      min={1}
                      max={10}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
            <Controller
              name="compact"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch
                    id="compact"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor="compact">Compact</FieldLabel>
                </Field>
              )}
            />
            <Button type="submit" disabled={isFetching}>
              {isFetching ? "Loading..." : "Query"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Request failed"}
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Results
              {nodeCount != null && edgeCount != null && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {nodeCount} nodes, {edgeCount} edges
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[600px] overflow-auto rounded-md bg-muted p-4 text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
