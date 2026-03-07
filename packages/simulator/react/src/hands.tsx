import type { FC } from "react";

import type { Vec2 } from "@juggling-tools/simulator";

/** Data passed to a custom hand render function. */
export type HandRenderData = {
  /** The 2D rendering context of the simulator canvas. */
  readonly ctx: CanvasRenderingContext2D;
  /** Position of this hand in canvas coordinates. */
  readonly position: Vec2;
  /** Canvas width in pixels, useful for scaling the hand size proportionally. */
  readonly canvasWidth: number;
};

/** Custom render function for drawing a hand. Receives {@link HandRenderData} with the canvas context and hand state. */
export type HandRenderFn = (data: HandRenderData) => void;

export type HandConfig = {
  readonly render?: HandRenderFn;
};

export type HandsConfig = {
  readonly count: number;
  readonly handRenderers: readonly HandConfig[];
};

/** Props for the {@link Hand} component. */
type HandProps = {
  /** Optional custom render function. When provided, replaces the default semi-circle drawing for this hand. */
  children?: HandRenderFn;
};

/**
 * Declarative hand configuration component.
 *
 * Place inside `<Simulator.Hands>` to configure individual hand rendering.
 * Hands are matched to the simulator's hands by index order (cycling if there
 * are more hands than `<Hand>` elements).
 *
 * This is a config-only component — it renders no DOM elements.
 */
export const Hand: FC<HandProps> = () => null;

/** Props for the {@link Hands} component. */
type HandsProps = {
  /** Number of hands in the simulation. @defaultValue 2 */
  count?: number;
  /** Optional `<Hand>` children for per-hand custom rendering. */
  children?: React.ReactNode;
};

/**
 * Declarative hands configuration component.
 *
 * Place inside `<Simulator.Canvas>` to control the number of hands and their
 * rendering. Nest `<Hand>` children inside for per-hand custom render functions.
 *
 * This is a config-only component — it renders no DOM elements.
 *
 * @example
 * ```tsx
 * <Simulator.Hands count={2}>
 *   <Simulator.Hand>{({ ctx, position }) => { ... }}</Simulator.Hand>
 * </Simulator.Hands>
 * ```
 */
export const Hands: FC<HandsProps> = () => null;
