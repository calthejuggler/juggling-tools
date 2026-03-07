import { Ball } from "./ball.js";
import { Canvas } from "./canvas.js";
import { Hand, Hands } from "./hands.js";
import { Juggler } from "./juggler.js";
import { Root } from "./root.js";

export { Root } from "./root.js";
export type { SimulatorHandle } from "./root.js";
export { Canvas } from "./canvas.js";
export { Juggler } from "./juggler.js";
export type { JugglerRenderData, JugglerRenderFn } from "./juggler.js";
export { Hands, Hand } from "./hands.js";
export type { HandRenderData, HandRenderFn } from "./hands.js";
export { Ball } from "./ball.js";
export type { BallRenderData, BallRenderFn } from "./ball.js";
export { useSimulator } from "./use-simulator.js";

export const Simulator = { Root, Canvas, Juggler, Hands, Hand, Ball };
