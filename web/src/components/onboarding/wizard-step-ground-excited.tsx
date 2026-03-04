import { cn } from "@/lib/utils";

import { m } from "@/paraglide/messages.js";

function MiniState({
  bits,
  label,
  variant,
}: {
  bits: boolean[];
  label: string;
  variant: "ground" | "excited";
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {bits.map((filled, i) => (
          <div
            key={i}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded border-2 text-[10px] font-bold",
              filled
                ? variant === "ground"
                  ? "border-success/80 bg-success/80 text-white"
                  : "border-primary bg-primary text-primary-foreground"
                : "border-muted bg-muted text-muted-foreground",
            )}
          >
            {filled ? "1" : "0"}
          </div>
        ))}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

export function WizardStepGroundExcited() {
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <h3 className="text-lg font-semibold">{m.onboarding_ground_title()}</h3>
      <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
        {m.onboarding_ground_desc()}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-center gap-6">
        <MiniState
          bits={[false, false, true, true, true]}
          label={m.onboarding_ground_label()}
          variant="ground"
        />
        <MiniState
          bits={[false, true, true, false, true]}
          label={m.onboarding_excited_label()}
          variant="excited"
        />
        <MiniState
          bits={[true, false, true, true, false]}
          label={m.onboarding_excited_label()}
          variant="excited"
        />
      </div>
      <svg
        viewBox="0 0 240 60"
        className="text-muted-foreground mt-2 h-16 w-60"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <circle cx="40" cy="30" r="16" className="fill-success/20 stroke-success" />
        <text x="40" y="34" textAnchor="middle" className="fill-success" fontSize="9" stroke="none">
          GND
        </text>
        <circle cx="120" cy="16" r="14" className="fill-primary/20 stroke-primary" />
        <text
          x="120"
          y="20"
          textAnchor="middle"
          className="fill-primary"
          fontSize="8"
          stroke="none"
        >
          EXC
        </text>
        <circle cx="120" cy="46" r="14" className="fill-primary/20 stroke-primary" />
        <text
          x="120"
          y="50"
          textAnchor="middle"
          className="fill-primary"
          fontSize="8"
          stroke="none"
        >
          EXC
        </text>
        <path d="M56 24 L104 18" markerEnd="url(#onboarding-arrowhead)" />
        <path d="M56 36 L104 44" markerEnd="url(#onboarding-arrowhead)" />
        <path d="M134 20 L200 28" markerEnd="url(#onboarding-arrowhead)" />
        <path d="M134 42 L200 34" markerEnd="url(#onboarding-arrowhead)" />
        <circle cx="210" cy="30" r="0" />
        <path d="M200 30 Q 220 30 210 14 Q 200 0 120 4" markerEnd="url(#onboarding-arrowhead)" />
        <path d="M30 14 Q 20 -4 40 -4 Q 60 -4 50 14" markerEnd="url(#onboarding-arrowhead)" />
        <defs>
          <marker
            id="onboarding-arrowhead"
            markerWidth="6"
            markerHeight="5"
            refX="5"
            refY="2.5"
            orient="auto"
          >
            <polygon points="0 0, 6 2.5, 0 5" fill="currentColor" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
