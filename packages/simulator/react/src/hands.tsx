import type { FC } from "react";

import type { Vec2 } from "@juggling-tools/simulator";

export type HandRenderData = {
  readonly ctx: CanvasRenderingContext2D;
  readonly position: Vec2;
  readonly canvasWidth: number;
};

export type HandRenderFn = (data: HandRenderData) => void;

export type HandConfig = {
  readonly render?: HandRenderFn;
};

export type HandsConfig = {
  readonly count: number;
  readonly handRenderers: readonly HandConfig[];
};

export type HandProps = {
  children?: HandRenderFn;
};

export const Hand: FC<HandProps> = () => null;

export type HandsProps = {
  count?: number;
  children?: React.ReactNode;
};

export const Hands: FC<HandsProps> = () => null;
