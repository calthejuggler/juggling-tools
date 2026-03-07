import { useCallback, useMemo } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Loader2, RotateCcw, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBuilderReducer } from "@/hooks/use-builder-reducer";
import type { BuilderValues } from "@/lib/schemas";
import { UI_MAX_HEIGHT } from "@/lib/schemas";
import { useThrowsQuery } from "@/queries/throws";

import { BuilderGraphPanel } from "./builder-graph-panel";
import { BuilderSimulatorPanel } from "./builder-simulator-panel";
import { PatternSequence } from "./pattern-sequence";
import { ThrowPicker } from "./throw-picker";

import { m } from "@/paraglide/messages.js";

interface BuilderCanvasProps {
  form: UseFormReturn<BuilderValues>;
  onFieldChange: () => void;
  numProps: number;
  maxHeight: number;
}

export function BuilderCanvas({ form, onFieldChange, numProps, maxHeight }: BuilderCanvasProps) {
  const groundState = (1 << numProps) - 1;
  const [state, dispatch] = useBuilderReducer(groundState);

  const { data, isFetching, error } = useThrowsQuery({
    state: state.currentState,
    max_height: maxHeight,
  });

  const handleChooseThrow = useCallback(
    (throwHeight: number, destination: number) => {
      dispatch({ type: "CHOOSE_THROW", throwHeight, destination });
    },
    [dispatch],
  );

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET", groundState });
  }, [dispatch, groundState]);

  // Precompute visitedStates at each step for accurate loop detection in the sequence
  const visitedStatesBefore = useMemo(() => {
    const result: Set<number>[] = [];
    const visited = new Set([state.groundState]);
    for (const step of state.steps) {
      result.push(new Set(visited));
      visited.add(step.destination);
    }
    return result;
  }, [state.steps, state.groundState]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:flex-row md:overflow-hidden">
      <div className="shrink-0">
        <Card className="w-full md:w-80 md:shadow-lg">
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{m.builder_setup()}</span>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-2 gap-3">
              <Controller
                name="num_props"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="num_props">{m.query_props()}</FieldLabel>
                    <Input
                      id="num_props"
                      type="number"
                      min={1}
                      max={UI_MAX_HEIGHT}
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.target.valueAsNumber);
                        onFieldChange();
                      }}
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
                    <FieldLabel htmlFor="max_height">{m.query_max_height()}</FieldLabel>
                    <Input
                      id="max_height"
                      type="number"
                      min={1}
                      max={UI_MAX_HEIGHT}
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.target.valueAsNumber);
                        onFieldChange();
                      }}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </form>

            <div className="border-border border-t pt-4">
              <p className="mb-2 text-sm font-semibold">{m.builder_sequence()}</p>
              <PatternSequence
                steps={state.steps}
                groundState={state.groundState}
                maxHeight={maxHeight}
                visitedStatesBefore={visitedStatesBefore}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={state.steps.length === 0}
              >
                <Undo2 className="h-3.5 w-3.5" />
                {m.builder_undo()}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={state.steps.length === 0}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {m.builder_reset()}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="order-2 flex flex-col gap-4 md:order-1 md:min-h-0 md:flex-1 md:flex-row">
          <Card className="h-[300px] md:h-auto md:min-h-0 md:flex-1 md:shadow-lg">
            <CardContent className="h-full p-0">
              <BuilderGraphPanel state={state} maxHeight={maxHeight} numProps={numProps} />
            </CardContent>
          </Card>
          <Card className="h-[300px] md:h-auto md:min-h-0 md:w-64 md:shadow-lg">
            <CardContent className="h-full p-0">
              <BuilderSimulatorPanel state={state} numProps={numProps} />
            </CardContent>
          </Card>
        </div>

        {data ? (
          <Card className="order-1 shrink-0 md:order-2 md:shadow-lg">
            <CardContent className="pt-4">
              <ThrowPicker
                throws={data.throws}
                isFetching={isFetching}
                error={error}
                currentState={state.currentState}
                groundState={state.groundState}
                maxHeight={maxHeight}
                visitedStates={state.visitedStates}
                onChooseThrow={handleChooseThrow}
              />
            </CardContent>
          </Card>
        ) : isFetching ? (
          <Card className="order-1 shrink-0 md:order-2 md:shadow-lg">
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-lg">{m.builder_loading_throws()}</p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="order-1 shrink-0 md:order-2 md:shadow-lg">
            <CardContent className="pt-4">
              <p className="text-destructive text-sm">{error.message}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
