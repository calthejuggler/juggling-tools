import { StateVisualizer } from "./state-visualizer";

import { m } from "@/paraglide/messages.js";

export function WizardStepWhatIsState() {
  const state = 0b11100; // 3 balls, max height 5

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <h3 className="text-lg font-semibold">{m.onboarding_state_title()}</h3>
      <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
        {m.onboarding_state_desc()}
      </p>
      <p className="text-muted-foreground max-w-md text-center text-xs italic">
        {m.onboarding_state_beat_explain()}
      </p>
      <div className="mt-2">
        <StateVisualizer state={state} maxHeight={5} />
      </div>
    </div>
  );
}
