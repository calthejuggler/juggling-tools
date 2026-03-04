import { CELL, STEP } from "./animation-constants";

interface SlotGridProps {
  cols: number;
}

export function SlotGrid({ cols }: SlotGridProps) {
  return Array.from({ length: cols }, (_, col) => (
    <div
      key={`slot-${col}`}
      className="absolute top-0 left-0"
      style={{ transform: `translate(${col * STEP}px, ${STEP}px)` }}
    >
      <div
        className="border-muted bg-muted text-muted-foreground flex items-center justify-center rounded-md border-2 text-xs font-bold"
        style={{ width: CELL, height: CELL }}
      >
        0
      </div>
      <div className="text-muted-foreground mt-1 text-center text-[10px]">{cols - col}</div>
    </div>
  ));
}
