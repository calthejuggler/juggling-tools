import { cn } from "@/lib/utils";

import { m } from "@/paraglide/messages.js";

interface StateVisualizerProps {
  state: number;
  maxHeight: number;
  highlightIndex?: number;
}

export function StateVisualizer({ state, maxHeight, highlightIndex }: StateVisualizerProps) {
  const bits: boolean[] = [];
  for (let i = 0; i < maxHeight; i++) {
    bits.push(((state >> i) & 1) === 1);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1.5">
        {bits.map((filled, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md border-2 text-xs font-bold transition-all sm:h-12 sm:w-12",
                filled
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted bg-muted text-muted-foreground",
                highlightIndex === i && "ring-ring ring-2 ring-offset-2",
              )}
            >
              {filled ? "1" : "0"}
            </div>
            <span className="text-muted-foreground text-[10px]">
              {m.onboarding_state_beat({ beat: String(maxHeight - i) })}
            </span>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-1 flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="bg-primary inline-block h-3 w-3 rounded-sm" />
          {m.onboarding_state_landing()}
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-muted inline-block h-3 w-3 rounded-sm border" />
          {m.onboarding_state_empty()}
        </span>
      </div>
    </div>
  );
}
