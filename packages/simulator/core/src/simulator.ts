import { computeBallPositions, getHandPositions, HAND_Y_RATIO } from "./physics.js";
import { renderFrame } from "./render.js";
import type { FrameData } from "./render.js";
import type { BallSchedule } from "./schedule.js";
import { computeSchedule } from "./schedule.js";
import { parseSiteswap } from "./siteswap.js";
import type { Vec2 } from "./types.js";

/**
 * A custom render function that replaces the default canvas drawing logic.
 *
 * When provided, the simulator calls this function every animation frame instead
 * of its built-in renderer, giving you full control over how the scene is drawn.
 *
 * @param ctx - The 2D rendering context of the simulator canvas.
 * @param width - Current canvas width in pixels.
 * @param height - Current canvas height in pixels.
 * @param frame - Pre-computed frame data containing ball positions, hand positions, and display settings.
 */
export type CustomRenderFn = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: FrameData,
) => void;

/** Configuration options for creating a simulator instance. */
export type SimulatorOptions = {
  /** Siteswap pattern string (e.g. `"531"`, `"97531"`). Each character is parsed as a base-36 digit. */
  siteswap: string;
  /** Number of hands used in the pattern. @defaultValue 2 */
  numHands?: number;
  /** Duration of one beat in milliseconds. Controls overall animation speed. @defaultValue 360 */
  beatDuration?: number;
  /** Fraction of a beat that a ball spends held in-hand before release (0–1). @defaultValue 0.6 */
  dwellRatio?: number;
  /** Horizontal position of the arc peak as a fraction of the flight (0–1). Values above 0.5 shift the peak toward the catching hand. @defaultValue 0.55 */
  arcPeakPosition?: number;
  /** CSS color strings assigned to balls in order, cycling if there are more balls than colors. @defaultValue A built-in palette of 8 colors */
  colors?: string[];
  /** CSS color string used to fill the canvas background each frame. @defaultValue `"#111111"` */
  background?: string;
  /** Whether to draw the stick-figure juggler. @defaultValue true */
  showJuggler?: boolean;
  /** Optional custom render function that replaces the built-in renderer. */
  render?: CustomRenderFn;
};

/**
 * Handle returned by {@link createSimulator} for controlling a running juggling animation.
 *
 * All setter methods update the simulation in real-time without restarting the animation
 * (except {@link Simulator.setSiteswap | setSiteswap}, {@link Simulator.setNumHands | setNumHands},
 * and {@link Simulator.setColors | setColors} which rebuild the ball schedule).
 */
export type Simulator = {
  /** Start the animation loop. No-op if already running. */
  readonly start: () => void;
  /** Stop the animation loop and cancel the current frame request. */
  readonly stop: () => void;
  /** Change the siteswap pattern. Rebuilds the ball schedule and restarts the animation. */
  readonly setSiteswap: (siteswap: string) => void;
  /** Change the number of hands. Rebuilds the ball schedule and restarts the animation. */
  readonly setNumHands: (numHands: number) => void;
  /** Change the beat duration (ms). Takes effect on the next frame without restarting. */
  readonly setBeatDuration: (beatDuration: number) => void;
  /** Change the dwell ratio (0–1). Takes effect on the next frame without restarting. */
  readonly setDwellRatio: (dwellRatio: number) => void;
  /** Change the arc peak position (0–1). Takes effect on the next frame without restarting. */
  readonly setArcPeakPosition: (arcPeakPosition: number) => void;
  /** Change ball colors. Rebuilds the ball schedule and restarts the animation. */
  readonly setColors: (colors: string[]) => void;
  /** Change the canvas background color. Takes effect on the next frame. */
  readonly setBackground: (background: string) => void;
  /** Toggle the stick-figure juggler visibility. Takes effect on the next frame. */
  readonly setShowJuggler: (showJuggler: boolean) => void;
  /** Set or clear a custom render function. Pass `undefined` to restore the default renderer. */
  readonly setRender: (render: CustomRenderFn | undefined) => void;
  /** Recalculate hand positions after the canvas has been resized. Call this after changing `canvas.width` or `canvas.height`. */
  readonly resize: () => void;
};

const INITIAL_SCHEDULE_BEATS = 50;
const SCHEDULE_REFRESH_THRESHOLD = 0.7;
const TOP_MARGIN_RATIO = 0.05;
const MAX_HEIGHT_PER_THROW_RATIO = 0.06;

const DEFAULT_COLORS = [
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#06b6d4",
];

const DEFAULTS = {
  numHands: 2,
  beatDuration: 360,
  dwellRatio: 0.6,
  arcPeakPosition: 0.55,
  colors: DEFAULT_COLORS,
  background: "#111111",
  showJuggler: true,
};

const resolveConfig = (options: SimulatorOptions) => ({
  siteswap: parseSiteswap(options.siteswap),
  numHands: options.numHands ?? DEFAULTS.numHands,
  beatDuration: options.beatDuration ?? DEFAULTS.beatDuration,
  dwellRatio: options.dwellRatio ?? DEFAULTS.dwellRatio,
  arcPeakPosition: options.arcPeakPosition ?? DEFAULTS.arcPeakPosition,
  colors: options.colors ?? DEFAULTS.colors,
  background: options.background ?? DEFAULTS.background,
  showJuggler: options.showJuggler ?? DEFAULTS.showJuggler,
});

type SimulatorConfig = ReturnType<typeof resolveConfig>;

type SimState = {
  readonly config: SimulatorConfig;
  readonly balls: readonly BallSchedule[];
  readonly scheduledUpToBeat: number;
  readonly handPositions: readonly Vec2[];
  readonly arcSkewExponent: number;
  readonly startTime: number;
};

const ARC_SKEW_LOG_BASE = 0.5;

const computeArcSkewExponent = (arcPeakPosition: number) =>
  Math.log(arcPeakPosition) / Math.log(ARC_SKEW_LOG_BASE);

const createState = (canvas: HTMLCanvasElement, config: SimulatorConfig): SimState => ({
  config,
  balls: computeSchedule(config.siteswap, config.numHands, INITIAL_SCHEDULE_BEATS, config.colors),
  scheduledUpToBeat: INITIAL_SCHEDULE_BEATS,
  handPositions: getHandPositions(canvas.width, canvas.height, config.numHands),
  arcSkewExponent: computeArcSkewExponent(config.arcPeakPosition),
  startTime: 0,
});

const stepState = (prev: SimState, elapsed: number): SimState => {
  const currentBeat = elapsed / prev.config.beatDuration;
  if (currentBeat > prev.scheduledUpToBeat * SCHEDULE_REFRESH_THRESHOLD) {
    const maxBeat = Math.ceil(currentBeat) + INITIAL_SCHEDULE_BEATS;
    return {
      ...prev,
      balls: computeSchedule(
        prev.config.siteswap,
        prev.config.numHands,
        maxBeat,
        prev.config.colors,
        prev.balls,
      ),
      scheduledUpToBeat: maxBeat,
    };
  }
  return prev;
};

const computeHeightPerThrow = (siteswap: readonly number[], canvasHeight: number) => {
  const maxThrow = Math.max(...siteswap);
  const handY = canvasHeight * HAND_Y_RATIO;
  const topMargin = canvasHeight * TOP_MARGIN_RATIO;
  const availableHeight = handY - topMargin;
  return Math.min(
    canvasHeight * MAX_HEIGHT_PER_THROW_RATIO,
    availableHeight / Math.max(maxThrow, 1),
  );
};

const computeFrame = (state: SimState, elapsed: number, canvasHeight: number) => {
  const heightPerThrow = computeHeightPerThrow(state.config.siteswap, canvasHeight);
  return {
    background: state.config.background,
    showJuggler: state.config.showJuggler,
    handPositions: state.handPositions,
    balls: computeBallPositions(state.balls, elapsed, state.handPositions, {
      beatDuration: state.config.beatDuration,
      dwellRatio: state.config.dwellRatio,
      arcSkewExponent: state.arcSkewExponent,
      heightPerThrow,
    }),
  };
};

/**
 * Create a new juggling simulator bound to an HTML canvas element.
 *
 * Returns a {@link Simulator} handle with methods to start/stop the animation
 * and update configuration in real-time. The simulator uses `requestAnimationFrame`
 * for smooth 60fps rendering.
 *
 * @example
 * ```ts
 * const sim = createSimulator(canvas, { siteswap: "531" });
 * sim.start();
 * ```
 *
 * @param canvas - The `<canvas>` element to render into.
 * @param options - Initial configuration for the simulation.
 * @returns A {@link Simulator} handle for controlling the animation.
 */
export const createSimulator = (
  canvas: HTMLCanvasElement,
  options: SimulatorOptions,
): Simulator => {
  const ctx = canvas.getContext("2d")!;

  let customRender = options.render;
  let state = createState(canvas, resolveConfig(options));
  let animationId: number | null = null;

  const tick = (now: number) => {
    const elapsed = now - state.startTime;
    state = stepState(state, elapsed);
    const frame = computeFrame(state, elapsed, canvas.height);
    if (customRender) {
      customRender(ctx, canvas.width, canvas.height, frame);
    } else {
      renderFrame(ctx, canvas.width, canvas.height, frame);
    }
    animationId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (animationId !== null) return;
    state = { ...state, startTime: performance.now() };
    tick(state.startTime);
  };

  const stop = () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  const rebuildState = () => {
    const wasRunning = animationId !== null;
    stop();
    state = createState(canvas, state.config);
    if (wasRunning) start();
  };

  const setSiteswap = (siteswap: string) => {
    state = { ...state, config: { ...state.config, siteswap: parseSiteswap(siteswap) } };
    rebuildState();
  };

  const setNumHands = (numHands: number) => {
    state = { ...state, config: { ...state.config, numHands } };
    rebuildState();
  };

  const setBeatDuration = (beatDuration: number) => {
    state = { ...state, config: { ...state.config, beatDuration } };
  };

  const setDwellRatio = (dwellRatio: number) => {
    state = { ...state, config: { ...state.config, dwellRatio } };
  };

  const setArcPeakPosition = (arcPeakPosition: number) => {
    state = {
      ...state,
      config: { ...state.config, arcPeakPosition },
      arcSkewExponent: computeArcSkewExponent(arcPeakPosition),
    };
  };

  const setColors = (colors: string[]) => {
    state = { ...state, config: { ...state.config, colors } };
    rebuildState();
  };

  const setBackground = (background: string) => {
    state = { ...state, config: { ...state.config, background } };
  };

  const setShowJuggler = (showJuggler: boolean) => {
    state = { ...state, config: { ...state.config, showJuggler } };
  };

  const setRender = (render: CustomRenderFn | undefined) => {
    customRender = render;
  };

  const resize = () => {
    state = {
      ...state,
      handPositions: getHandPositions(canvas.width, canvas.height, state.config.numHands),
    };
  };

  return {
    start,
    stop,
    setSiteswap,
    setNumHands,
    setBeatDuration,
    setDwellRatio,
    setArcPeakPosition,
    setColors,
    setBackground,
    setShowJuggler,
    setRender,
    resize,
  };
};
