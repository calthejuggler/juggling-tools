import type { FC } from "react";

import type { Vec2 } from "@juggling-tools/simulator";

/** Data passed to a custom ball render function. */
export type BallRenderData = {
  /** The 2D rendering context of the simulator canvas. */
  readonly ctx: CanvasRenderingContext2D;
  /** Current position of the ball in canvas coordinates. */
  readonly position: Vec2;
  /** The color assigned to this ball via the `<Ball>` component's `color` prop. */
  readonly color: string;
  /** Canvas width in pixels, useful for scaling the ball size proportionally. */
  readonly canvasWidth: number;
};

/** Custom render function for drawing a ball. Receives {@link BallRenderData} with the canvas context and ball state. */
export type BallRenderFn = (data: BallRenderData) => void;

export type BallConfig = {
  readonly color: string;
  readonly render?: BallRenderFn;
};

/** Props for the {@link Ball} component. */
type BallProps = {
  /** CSS color string for this ball. */
  color: string;
  /** Optional custom render function. When provided, replaces the default filled-circle drawing for this ball. */
  children?: BallRenderFn;
};

/**
 * Declarative ball configuration component.
 *
 * Place inside `<Simulator.Canvas>` to define each ball's color and optional custom
 * rendering. Balls are matched to the pattern's balls by index order (cycling if
 * there are more pattern balls than `<Ball>` elements).
 *
 * This is a config-only component — it renders no DOM elements.
 *
 * @example
 * ```tsx
 * <Simulator.Ball color="#ef4444" />
 * <Simulator.Ball color="#22c55e">
 *   {({ ctx, position, color, canvasWidth }) => {
 *     // custom drawing logic
 *   }}
 * </Simulator.Ball>
 * ```
 */
export const Ball: FC<BallProps> = () => null;
