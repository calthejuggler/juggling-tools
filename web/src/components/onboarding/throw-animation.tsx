import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { motion } from "framer-motion";
import { Loader2, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  BALL_BASE_CLASS,
  BALL_CLASS_DEFAULT,
  BALL_CLASS_GROUND,
  CELL,
  GAP,
  LABEL_H,
  SPRING,
  STEP,
} from "./animation-constants";
import { SlotGrid } from "./slot-grid";

import { m } from "@/paraglide/messages.js";

type Phase = "before" | "throw-up" | "shifted" | "fly-across" | "landed";

interface ThrowAnimationProps {
  beforeState: readonly boolean[];
  throwHeight: number;
  label: string;
  onAnimationComplete?: () => void;
}

export function ThrowAnimation({
  beforeState,
  throwHeight,
  label,
  onAnimationComplete,
}: ThrowAnimationProps) {
  const [phase, setPhase] = useState<Phase>("before");

  const throwCol = beforeState.length - 1;
  const landingCol = beforeState.length - throwHeight;
  const cols = beforeState.length;

  const stationaryBalls = useMemo(() => {
    const balls: { id: string; beforeCol: number; shiftedCol: number }[] = [];
    beforeState.forEach((filled, i) => {
      if (filled && i !== throwCol) {
        balls.push({ id: `ball-${i}`, beforeCol: i, shiftedCol: i + 1 });
      }
    });
    return balls;
  }, [beforeState, throwCol]);

  const containerWidth = cols * CELL + (cols - 1) * GAP;
  const containerHeight = 2 * CELL + GAP + LABEL_H;

  const shifted = phase !== "before" && phase !== "throw-up";

  const thrownX =
    phase === "fly-across" || phase === "landed" ? landingCol * STEP : throwCol * STEP;
  const thrownY = phase === "throw-up" || phase === "shifted" || phase === "fly-across" ? 0 : STEP;

  const finalCols = [landingCol, ...stationaryBalls.map((b) => b.shiftedCol)].sort((a, b) => a - b);
  const isGroundAtEnd = finalCols.every((col, i) => col === cols - finalCols.length + i);

  const ballClass = phase === "landed" && isGroundAtEnd ? BALL_CLASS_GROUND : BALL_CLASS_DEFAULT;
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const play = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPhase("throw-up");
    timeoutsRef.current.push(setTimeout(() => setPhase("shifted"), 600));
    timeoutsRef.current.push(setTimeout(() => setPhase("fly-across"), 1200));
    timeoutsRef.current.push(setTimeout(() => setPhase("landed"), 1800));
    if (onAnimationComplete)
      timeoutsRef.current.push(setTimeout(() => onAnimationComplete(), 2000));
  }, [onAnimationComplete]);

  const replay = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPhase("before");
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <div className="relative" style={{ width: containerWidth, height: containerHeight }}>
        <SlotGrid cols={cols} />

        {stationaryBalls.map((ball) => (
          <motion.div
            key={ball.id}
            className={cn(BALL_BASE_CLASS, ballClass)}
            style={{ width: CELL, height: CELL }}
            initial={false}
            animate={{
              x: (shifted ? ball.shiftedCol : ball.beforeCol) * STEP,
              y: STEP,
            }}
            transition={SPRING}
          >
            1
          </motion.div>
        ))}

        {beforeState[throwCol] && (
          <motion.div
            className={cn(
              BALL_BASE_CLASS,
              ballClass,
              phase === "landed" && "ring-ring ring-2 ring-offset-2",
            )}
            style={{ width: CELL, height: CELL }}
            initial={false}
            animate={{ x: thrownX, y: thrownY }}
            transition={SPRING}
          >
            1
          </motion.div>
        )}
      </div>
      <div className="flex gap-2">
        {phase === "landed" ? (
          <Button size="sm" variant="outline" onClick={replay}>
            <RotateCcw className="mr-1 h-3 w-3" />
            {m.onboarding_throws_replay()}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={play} disabled={phase !== "before"}>
            {phase === "before" ? (
              <Play className="mr-1 h-3 w-3" />
            ) : (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            {phase === "before"
              ? m.onboarding_throws_play()
              : m.onboarding_throws_throwing({ height: String(throwHeight) })}
          </Button>
        )}
      </div>
    </div>
  );
}
