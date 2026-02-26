import { Controller, type UseFormReturn } from "react-hook-form";

import { Loader2 } from "lucide-react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UI_MAX_HEIGHT, type GraphsValues } from "@/lib/schemas";
import type { ViewType } from "@/lib/view-types";
import { useConfigQuery } from "@/queries/config";

interface QueryFormProps {
  form: UseFormReturn<GraphsValues>;
  onSubmit: (values: GraphsValues) => void;
  onFieldChange: () => void;
  reversed: boolean;
  onReversedChange: (checked: boolean) => void;
  isFetching: boolean;
  error: Error | null;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function QueryForm({
  form,
  onSubmit,
  onFieldChange,
  reversed,
  onReversedChange,
  isFetching,
  error,
  view,
  onViewChange,
}: QueryFormProps) {
  const { data: config } = useConfigQuery();
  const effectiveMax = Math.min(config?.max_max_height ?? UI_MAX_HEIGHT, UI_MAX_HEIGHT);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Query</span>
        {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="num_props"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="num_props">Props</FieldLabel>
                <Input
                  id="num_props"
                  type="number"
                  min={1}
                  max={effectiveMax}
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
                <FieldLabel htmlFor="max_height">Max height</FieldLabel>
                <Input
                  id="max_height"
                  type="number"
                  min={1}
                  max={effectiveMax}
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
        </div>
        <div className="flex items-center gap-2">
          <Switch id="reversed" size="sm" checked={reversed} onCheckedChange={onReversedChange} />
          <Label htmlFor="reversed" className="text-xs font-normal">
            Reverse notation
          </Label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-normal">View</Label>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (v) onViewChange(v as ViewType);
            }}
          >
            <ToggleGroupItem value="graph" className="flex-1 text-xs">
              Graph
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className="flex-1 text-xs">
              Table
            </ToggleGroupItem>
            <ToggleGroupItem value="scatter" className="flex-1 text-xs">
              Scatter
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {error && (
          <p className="text-destructive text-xs">
            {error instanceof Error ? error.message : "Request failed"}
          </p>
        )}
      </form>
    </div>
  );
}
