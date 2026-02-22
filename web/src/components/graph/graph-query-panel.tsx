import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Panel } from "@xyflow/react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MAX_MAX_HEIGHT, type GraphsValues } from "@/lib/schemas";

interface GraphQueryPanelProps {
  form: UseFormReturn<GraphsValues>;
  onSubmit: (values: GraphsValues) => void;
  onFieldChange: () => void;
  reversed: boolean;
  onReversedChange: (checked: boolean) => void;
  isFetching: boolean;
  error: Error | null;
}

export function GraphQueryPanel({
  form,
  onSubmit,
  onFieldChange,
  reversed,
  onReversedChange,
  isFetching,
  error,
}: GraphQueryPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Panel position="top-left">
      <Card className="w-72 shadow-lg">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Query</span>
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
        {!collapsed && (
          <CardContent className="pt-3">
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
                        max={MAX_MAX_HEIGHT}
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
                        max={MAX_MAX_HEIGHT}
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
                <Switch
                  id="reversed"
                  size="sm"
                  checked={reversed}
                  onCheckedChange={onReversedChange}
                />
                <Label htmlFor="reversed" className="text-xs font-normal">
                  Reverse notation
                </Label>
              </div>
              {error && (
                <p className="text-destructive text-xs">
                  {error instanceof Error ? error.message : "Request failed"}
                </p>
              )}
            </form>
          </CardContent>
        )}
      </Card>
    </Panel>
  );
}
