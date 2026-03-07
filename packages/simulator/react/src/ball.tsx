import type { Vec2 } from "@juggling-tools/simulator";

export type BallRenderData = {
  readonly ctx: CanvasRenderingContext2D;
  readonly position: Vec2;
  readonly color: string;
  readonly canvasWidth: number;
};

export type BallRenderFn = (data: BallRenderData) => void;

export type BallConfig = {
  readonly color: string;
  readonly render?: BallRenderFn;
};

export type BallProps = {
  color: string;
  children?: BallRenderFn;
};

export const Ball = (_props: BallProps) => null;
