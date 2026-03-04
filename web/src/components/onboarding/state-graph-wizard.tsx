import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

import { WizardStepGroundExcited } from "./wizard-step-ground-excited";
import { WizardStepHowThrowsWork } from "./wizard-step-how-throws-work";
import { WizardStepTheGraph } from "./wizard-step-the-graph";
import { WizardStepWelcome } from "./wizard-step-welcome";
import { WizardStepWhatIsState } from "./wizard-step-what-is-state";

import { m } from "@/paraglide/messages.js";

const STEPS = [
  WizardStepWelcome,
  WizardStepWhatIsState,
  WizardStepHowThrowsWork,
  WizardStepGroundExcited,
  WizardStepTheGraph,
] as const;

const TOTAL_STEPS = STEPS.length;

interface StateGraphWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function StateGraphWizard({ open, onOpenChange, onComplete }: StateGraphWizardProps) {
  const [step, setStep] = useState(0);

  const StepComponent = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOTAL_STEPS - 1;

  function handleNext() {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m.onboarding_wizard_title()}</DialogTitle>
          <DialogDescription>
            {m.onboarding_step_of({ step: String(step + 1), total: String(TOTAL_STEPS) })}
          </DialogDescription>
        </DialogHeader>
        <Progress
          value={((step + 1) / TOTAL_STEPS) * 100}
          className="mb-2"
          aria-label={m.onboarding_step_of({ step: String(step + 1), total: String(TOTAL_STEPS) })}
        />
        <div className="min-h-[280px]">
          <StepComponent />
        </div>
        <DialogFooter className="sm:justify-between">
          <div>
            {!isFirst && (
              <Button variant="outline" onClick={handleBack}>
                {m.onboarding_back()}
              </Button>
            )}
          </div>
          <Button onClick={handleNext}>
            {isLast ? m.onboarding_finish() : m.onboarding_next()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
