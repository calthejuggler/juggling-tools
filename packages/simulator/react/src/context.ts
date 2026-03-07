import { createContext, useContext } from "react";

import type { Simulator } from "@juggling-tools/simulator";

export type SimulatorContextValue = {
  readonly simulator: Simulator | null;
  readonly registerCanvas: (canvas: HTMLCanvasElement) => void;
  readonly siteswap: string;
  readonly setSiteswap: (siteswap: string) => void;
  readonly start: () => void;
  readonly stop: () => void;
  readonly isRunning: boolean;
  readonly error: Error | null;
};

export const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export const useSimulatorContext = () => {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator must be used within a <Simulator.Root>");
  return ctx;
};
