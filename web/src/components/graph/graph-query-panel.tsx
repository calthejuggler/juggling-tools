import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Panel } from "@xyflow/react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GraphsValues } from "@/lib/schemas";
import type { ViewType } from "@/lib/view-types";

import { QueryForm } from "../query-form";

interface GraphQueryPanelProps {
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

export function GraphQueryPanel({
  form,
  onSubmit,
  onFieldChange,
  reversed,
  onReversedChange,
  isFetching,
  error,
  view,
  onViewChange,
}: GraphQueryPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Panel position="top-left">
      <Card className="w-72 shadow-lg">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Query</span>
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
        )}
      </Card>
    </Panel>
  );
}
