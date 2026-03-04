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

interface PatternAnimationProps {
  initialState: readonly boolean[];
  throwHeights: readonly number[];
  label: string;
}

interface BallPos {
  col: number;
  row: number; // 0 = air, 1 = ground
}

/*
 * Phase layout (for N throws):
 *   0              → throw-0 "before" (first throw only)
 *   1, 2, 3, 4     → throw-0 sub-phases: throw-up, shifted, fly-across, landed
 *   5, 6, 7, 8     → throw-1 sub-phases
 *   …
 * Total phases = 1 + 4 * N
 */
function computePhases(
  initialState: readonly boolean[],
  throwHeights: readonly number[],
): { ballIds: string[]; phases: Map<string, BallPos>[]; isGroundAtEnd: boolean } {
  const cols = initialState.length;

  const ballIds: string[] = [];
  let currentCols = new Map<string, number>();
  initialState.forEach((filled, col) => {
    if (filled) {
      const id = `ball-${ballIds.length}`;
      ballIds.push(id);
      currentCols.set(id, col);
    }
  });

  const phases: Map<string, BallPos>[] = [];

  for (let t = 0; t < throwHeights.length; t++) {
    const throwHeight = throwHeights[t];
    const throwCol = cols - 1;
    const landingCol = cols - throwHeight;

    let thrownId = "";
    for (const [id, col] of currentCols) {
      if (col === throwCol) {
        thrownId = id;
        break;
      }
    }

    if (!thrownId) continue;

    const stationaryEntries = [...currentCols.entries()].filter(([id]) => id !== thrownId);

    // before (first throw only)
    if (t === 0) {
      const p = new Map<string, BallPos>();
      for (const [id, col] of currentCols) p.set(id, { col, row: 1 });
      phases.push(p);
    }

    // throw-up
    {
      const p = new Map<string, BallPos>();
      for (const [id, col] of currentCols) {
        p.set(id, { col, row: id === thrownId ? 0 : 1 });
      }
      phases.push(p);
    }

    // shifted
    {
      const p = new Map<string, BallPos>();
      p.set(thrownId, { col: throwCol, row: 0 });
      for (const [id, col] of stationaryEntries) {
        p.set(id, { col: col + 1, row: 1 });
      }
      phases.push(p);
    }

    // fly-across
    {
      const p = new Map<string, BallPos>();
      p.set(thrownId, { col: landingCol, row: 0 });
      for (const [id, col] of stationaryEntries) {
        p.set(id, { col: col + 1, row: 1 });
      }
      phases.push(p);
    }

    // landed
    {
      const p = new Map<string, BallPos>();
      p.set(thrownId, { col: landingCol, row: 1 });
      for (const [id, col] of stationaryEntries) {
        p.set(id, { col: col + 1, row: 1 });
      }
      phases.push(p);
    }

    currentCols = new Map<string, number>();
    currentCols.set(thrownId, landingCol);
    for (const [id, col] of stationaryEntries) {
      currentCols.set(id, col + 1);
    }
  }

  if (phases.length === 0) {
    return { ballIds, phases: [], isGroundAtEnd: false };
  }

  const finalPositions = phases[phases.length - 1];
  const finalCols = [...finalPositions.values()].map((p) => p.col).sort((a, b) => a - b);
  const isGroundAtEnd = finalCols.every((col, i) => col === cols - finalCols.length + i);

  return { ballIds, phases, isGroundAtEnd };
}

export function PatternAnimation({ initialState, throwHeights, label }: PatternAnimationProps) {
  const { ballIds, phases, isGroundAtEnd } = useMemo(
    () => computePhases(initialState, throwHeights),
    [initialState, throwHeights],
  );

  const [phaseIndex, setPhaseIndex] = useState(0);
  const cols = initialState.length;

  const containerWidth = cols * CELL + (cols - 1) * GAP;
  const containerHeight = 2 * CELL + GAP + LABEL_H;

  const isFirst = phaseIndex === 0;
  const isLast = phaseIndex === phases.length - 1;
  const isAnimating = !isFirst && !isLast;

  const ballClass = isLast && isGroundAtEnd ? BALL_CLASS_GROUND : BALL_CLASS_DEFAULT;
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const currentThrowIndex = isFirst ? 0 : Math.floor((phaseIndex - 1) / 4);

  const isLandedSubPhase = phaseIndex >= 1 && (phaseIndex - 1) % 4 === 3;
  const currentLandingCol =
    cols - throwHeights[Math.min(currentThrowIndex, throwHeights.length - 1)];

  const play = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    let delay = 0;
    for (let i = 1; i < phases.length; i++) {
      delay += 500;
      // Extra pause before each subsequent throw's throw-up phase
      if (i > 1 && (i - 1) % 4 === 0) delay += 400;
      const idx = i;
      timeoutsRef.current.push(setTimeout(() => setPhaseIndex(idx), delay));
    }
  }, [phases.length]);

  const replay = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPhaseIndex(0);
  }, []);

  const currentPositions = phases[phaseIndex];
  if (!currentPositions) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <div className="relative" style={{ width: containerWidth, height: containerHeight }}>
        <SlotGrid cols={cols} />

        {ballIds.map((id) => {
          const pos = currentPositions.get(id);
          if (!pos) return null;
          const isLandedBall = isLandedSubPhase && pos.row === 1 && pos.col === currentLandingCol;
          return (
            <motion.div
              key={id}
              className={cn(
                BALL_BASE_CLASS,
                ballClass,
                isLandedBall && "ring-ring ring-2 ring-offset-2",
              )}
              style={{ width: CELL, height: CELL }}
              initial={false}
              animate={{ x: pos.col * STEP, y: pos.row * STEP }}
              transition={SPRING}
            >
              1
            </motion.div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {isLast ? (
          <Button size="sm" variant="outline" onClick={replay}>
            <RotateCcw className="mr-1 h-3 w-3" />
            {m.onboarding_throws_replay()}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={play} disabled={isAnimating}>
            {isFirst ? (
              <Play className="mr-1 h-3 w-3" />
            ) : (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            {isFirst
              ? m.onboarding_throws_play()
              : m.onboarding_throws_throwing({
                  height: String(throwHeights[currentThrowIndex]),
                })}
          </Button>
        )}
      </div>
    </div>
  );
}
