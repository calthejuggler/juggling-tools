import { useSimulatorContext } from "./context.js";

export const useSimulator = () => {
  const { siteswap, setSiteswap, start, stop, isRunning, error } = useSimulatorContext();
  return { siteswap, setSiteswap, start, stop, isRunning, error };
};
