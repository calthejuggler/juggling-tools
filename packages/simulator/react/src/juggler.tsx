import type { Vec2 } from "@juggling-tools/simulator";

export type JugglerRenderData = {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly handPositions: readonly Vec2[];
};

export type JugglerRenderFn = (data: JugglerRenderData) => void;

export type JugglerConfig = {
  readonly render?: JugglerRenderFn;
};

export type JugglerProps = {
  children?: JugglerRenderFn;
};

export const Juggler = (_props: JugglerProps) => null;
