import type { FC } from "react";

import type { Vec2 } from "@juggling-tools/simulator";

/** Data passed to a custom juggler render function. */
export type JugglerRenderData = {
  /** The 2D rendering context of the simulator canvas. */
  readonly ctx: CanvasRenderingContext2D;
  /** Canvas width in pixels. */
  readonly width: number;
  /** Canvas height in pixels. */
  readonly height: number;
  /** Positions of each hand in canvas coordinates. */
  readonly handPositions: readonly Vec2[];
};

/** Custom render function for drawing the juggler figure. Receives {@link JugglerRenderData} with the canvas context and layout info. */
export type JugglerRenderFn = (data: JugglerRenderData) => void;

export type JugglerConfig = {
  readonly render?: JugglerRenderFn;
};

/** Props for the {@link Juggler} component. */
type JugglerProps = {
  /** Optional custom render function. When provided, replaces the default stick-figure drawing. */
  children?: JugglerRenderFn;
};

/**
 * Declarative juggler configuration component.
 *
 * Place inside `<Simulator.Canvas>` to enable juggler rendering. Pass a child
 * render function to replace the default stick-figure with a custom drawing.
 *
 * This is a config-only component — it renders no DOM elements.
 *
 * @example
 * ```tsx
 * // Default stick figure
 * <Simulator.Juggler />
 *
 * // Custom renderer
 * <Simulator.Juggler>
 *   {({ ctx, width, height, handPositions }) => { ... }}
 * </Simulator.Juggler>
 * ```
 */
export const Juggler: FC<JugglerProps> = () => null;
