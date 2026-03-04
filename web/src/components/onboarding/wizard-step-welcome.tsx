import { m } from "@/paraglide/messages.js";

export function WizardStepWelcome() {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="text-5xl">🤹</div>
      <h3 className="text-xl font-semibold">{m.onboarding_welcome_title()}</h3>
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
        {m.onboarding_welcome_desc()}
      </p>
    </div>
  );
}
