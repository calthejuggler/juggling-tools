import { createContext, useContext } from "react";

import type { Simulator } from "@juggling-tools/simulator";

/** Internal context value shared between simulator components. */
type SimulatorContextValue = {
  /** The underlying core simulator instance, or `null` before the canvas is registered. */
  readonly simulator: Simulator | null;
  /** Callback to register a canvas element with the simulator. Called by `<Canvas>`. */
  readonly registerCanvas: (canvas: HTMLCanvasElement) => void;
  /** The current siteswap pattern string. */
  readonly siteswap: string;
  /** Update the siteswap pattern. */
  readonly setSiteswap: (siteswap: string) => void;
  /** Start the animation. */
  readonly start: () => void;
  /** Stop the animation. */
  readonly stop: () => void;
  /** Whether the animation is currently running. */
  readonly isRunning: boolean;
  /** The most recent siteswap parse or validation error, or `null` if valid. */
  readonly error: Error | null;
};

/** @internal React context for sharing simulator state between compound components. */
export const SimulatorContext = createContext<SimulatorContextValue | null>(null);

/**
 * @internal
 * Access the simulator context. Throws if used outside a `<Simulator.Root>`.
 */
export const useSimulatorContext = () => {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator must be used within a <Simulator.Root>");
  return ctx;
};
