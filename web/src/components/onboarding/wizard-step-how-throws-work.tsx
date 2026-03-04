import { useCallback, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Eye, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { PatternAnimation } from "./pattern-animation";
import { ThrowAnimation } from "./throw-animation";

import { m } from "@/paraglide/messages.js";

const singleExamples = [
  {
    before: [false, false, true, true, true],
    throwHeight: 4,
    label: () => m.onboarding_throws_throw_label({ height: "4" }) + " \u2192 00111 \u2192 01011",
  },
  {
    before: [false, false, true, true, true],
    throwHeight: 3,
    label: () => m.onboarding_throws_throw_label({ height: "3" }) + " \u2192 00111 \u2192 00111",
  },
] as const;

const THREE_BALL_GROUND = [false, false, true, true, true];
const FOUR_BALL_GROUND = [false, true, true, true, true];

const patterns = [
  {
    initialState: THREE_BALL_GROUND,
    throwHeights: [4, 4, 1],
    name: "441",
    desc: () => m.onboarding_throws_pattern_441_desc(),
  },
  {
    initialState: THREE_BALL_GROUND,
    throwHeights: [5, 3, 1],
    name: "531",
    desc: () => m.onboarding_throws_pattern_531_desc(),
  },
  {
    initialState: FOUR_BALL_GROUND,
    throwHeights: [5, 5, 2],
    name: "552",
    desc: () => m.onboarding_throws_pattern_552_desc(),
  },
] as const;

const tabs = [
  { label: () => m.onboarding_throws_throw_label({ height: "4" }) },
  { label: () => m.onboarding_throws_throw_label({ height: "3" }) },
  ...patterns.map((p) => ({
    label: () => m.onboarding_throws_pattern_label({ pattern: p.name }),
  })),
];

const QUIZ_OPTIONS = ["01011", "00111", "01101"] as const;
const CORRECT_ANSWER = "00111";

type QuizState = "not-started" | "pending" | "answered";

export function WizardStepHowThrowsWork() {
  const [example, setExample] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("not-started");
  const [quizSelection, setQuizSelection] = useState<string | undefined>();

  const quizAnswered = quizState === "answered";
  const quizCorrect = quizAnswered && quizSelection === CORRECT_ANSWER;

  const patternIndex = example - singleExamples.length;

  const handleFirstThrowComplete = useCallback(() => {
    setQuizState("pending");
  }, []);

  const handleCheck = useCallback(() => {
    if (!quizSelection) return;
    setQuizState("answered");
  }, [quizSelection]);

  const handleTryAgain = useCallback(() => {
    setQuizState("pending");
    setQuizSelection(undefined);
  }, []);

  const handleShowMe = useCallback(() => {
    setQuizState("answered");
    setExample(1);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <h3 className="text-lg font-semibold">{m.onboarding_throws_title()}</h3>
      <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
        {m.onboarding_throws_desc()}
      </p>
      <div className="mt-2">
        {patternIndex >= 0 ? (
          <div className="flex flex-col items-center gap-1">
            <PatternAnimation
              key={example}
              initialState={patterns[patternIndex].initialState}
              throwHeights={patterns[patternIndex].throwHeights}
              label={m.onboarding_throws_pattern_label({
                pattern: patterns[patternIndex].name,
              })}
            />
            <p className="text-muted-foreground text-xs italic">{patterns[patternIndex].desc()}</p>
          </div>
        ) : (
          <ThrowAnimation
            key={example}
            beforeState={singleExamples[example].before}
            throwHeight={singleExamples[example].throwHeight}
            label={singleExamples[example].label()}
            onAnimationComplete={example === 0 ? handleFirstThrowComplete : undefined}
          />
        )}
      </div>

      <AnimatePresence mode="wait">
        {quizState === "pending" && (
          <motion.div
            key="quiz-pending"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.35, ease: "easeOut" },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
            style={{ overflow: "hidden" }}
          >
            <div className="bg-muted/50 flex flex-col items-center gap-3 rounded-lg border p-4">
              <p className="max-w-sm text-center text-sm font-medium">
                {m.onboarding_throws_quiz_prompt()}
              </p>
              <ToggleGroup
                type="single"
                variant="outline"
                value={quizSelection}
                onValueChange={(v) => v && setQuizSelection(v)}
              >
                {QUIZ_OPTIONS.map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="font-mono text-xs">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Button size="sm" onClick={handleCheck} disabled={!quizSelection}>
                {m.onboarding_throws_quiz_check()}
              </Button>
            </div>
          </motion.div>
        )}

        {quizState === "answered" && example === 0 && (
          <motion.div
            key="quiz-answered"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.35, ease: "easeOut" },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
            style={{ overflow: "hidden" }}
          >
            <div
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3",
                quizCorrect
                  ? "border-success/30 bg-success/10"
                  : "border-destructive/30 bg-destructive/10",
              )}
            >
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {quizCorrect ? (
                  <>
                    <Check className="text-success h-4 w-4" />
                    {m.onboarding_throws_quiz_correct()}
                  </>
                ) : (
                  <>
                    <X className="text-destructive h-4 w-4" />
                    {m.onboarding_throws_quiz_wrong()}
                  </>
                )}
              </p>
              <div className="flex gap-2">
                {!quizCorrect && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleTryAgain}>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      {m.onboarding_throws_quiz_try_again()}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleShowMe}>
                      <Eye className="mr-1 h-3 w-3" />
                      {m.onboarding_throws_quiz_show_me()}
                    </Button>
                  </>
                )}
                {quizCorrect && (
                  <Button size="sm" onClick={() => setExample(singleExamples.length)}>
                    {m.onboarding_throws_try_pattern()}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((tab, i) => {
          const locked = !quizAnswered && i > 0;
          return (
            <button
              key={i}
              onClick={() => !locked && setExample(i)}
              disabled={locked}
              title={locked ? m.onboarding_throws_locked() : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                example === i
                  ? "bg-primary text-primary-foreground"
                  : locked
                    ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {tab.label()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
