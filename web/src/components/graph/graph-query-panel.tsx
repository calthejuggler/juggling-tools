import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Panel } from "@xyflow/react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GraphsValues } from "@/lib/schemas";
import type { ViewType } from "@/lib/view-types";

import { QueryForm } from "../query-form";

import { m } from "@/paraglide/messages.js";

interface GraphQueryPanelProps {
  form: UseFormReturn<GraphsValues>;
  onSubmit: (values: GraphsValues) => void;
  onFieldChange: () => void;
  reversed: boolean;
  onReversedChange: (checked: boolean) => void;
  abbreviated: boolean;
  onAbbreviatedChange: (checked: boolean) => void;
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
  abbreviated,
  onAbbreviatedChange,
  isFetching,
  error,
  view,
  onViewChange,
}: GraphQueryPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Panel position="top-left">
      <Card className="w-80 shadow-lg">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{m.query_label()}</span>
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
        )}
      </Card>
    </Panel>
  );
}
