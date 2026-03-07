import { effectiveHeight } from "./physics.js";
import type { BallPosition } from "./physics.js";
import type { Vec2 } from "./types.js";

const HEAD_RADIUS_RATIO = 0.05;
const HEAD_Y_RATIO = 0.65;
const NECK_TO_SHOULDER_RATIO = 0.03;
const WAIST_Y_RATIO = 1.05;
const SHOULDER_WIDTH_RATIO = 0.14;
const JUGGLER_LINE_WIDTH = 2.5;
export const DEFAULT_FOREGROUND = "rgba(255, 255, 255, 0.6)";
const ELBOW_OFFSET_RATIO = 0.04;

const BALL_RADIUS_RATIO = 0.032;

const HAND_SIZE_RATIO = 0.025;
const HAND_LINE_WIDTH = 2;

/** Pre-computed data for a single animation frame, passed to the renderer or a {@link CustomRenderFn}. */
export type FrameData = {
  /** CSS color string for the canvas background. */
  readonly background: string;
  /** CSS color string for the juggler and hand strokes. */
  readonly foreground: string;
  /** Whether the stick-figure juggler should be drawn. */
  readonly showJuggler: boolean;
  /** Positions of each hand in canvas coordinates. */
  readonly handPositions: readonly Vec2[];
  /** Current position and color for each ball in the pattern. */
  readonly balls: readonly BallPosition[];
};

/**
 * Render a complete animation frame using the built-in renderer.
 *
 * Clears the canvas, then draws the juggler (if enabled), hands, and balls.
 * This is the default render pipeline used when no custom render function is set.
 *
 * @param ctx - The 2D rendering context of the canvas.
 * @param width - Canvas width in pixels.
 * @param height - Canvas height in pixels.
 * @param frame - Pre-computed frame data to draw.
 */
export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: FrameData,
) => {
  clearCanvas(ctx, width, height, frame.background);

  if (frame.showJuggler) {
    drawJuggler(ctx, width, height, frame.handPositions, frame.foreground);
  }

  for (const hand of frame.handPositions) {
    drawHand(ctx, width, hand, frame.foreground);
  }

  for (const ball of frame.balls) {
    drawBall(ctx, width, ball.position, ball.color);
  }
};

export const clearCanvas = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: string,
) => {
  if (background === "transparent") {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
};

/**
 * Draw a stick-figure juggler with arms extending to the given hand positions.
 *
 * Renders a head, spine, shoulder line, and two-segment arms (shoulder → elbow → hand).
 * Useful in custom render functions when you want to keep the default juggler appearance.
 *
 * @param ctx - The 2D rendering context of the canvas.
 * @param width - Canvas width in pixels (used to scale proportions).
 * @param height - Canvas height in pixels (used to scale proportions).
 * @param handPositions - Position of each hand in canvas coordinates.
 */
export const drawJuggler = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  handPositions: readonly Vec2[],
  foreground = DEFAULT_FOREGROUND,
) => {
  const eh = effectiveHeight(width, height);
  const centerX = width / 2;
  const headRadius = width * HEAD_RADIUS_RATIO;
  const headY = height - eh * (1 - HEAD_Y_RATIO);
  const neckY = headY + headRadius;
  const shoulderY = neckY + eh * NECK_TO_SHOULDER_RATIO;
  const waistY = height - eh * (1 - WAIST_Y_RATIO);
  const shoulderWidth = width * SHOULDER_WIDTH_RATIO;

  ctx.strokeStyle = foreground;
  ctx.lineWidth = JUGGLER_LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.arc(centerX, headY, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX, neckY);
  ctx.lineTo(centerX, waistY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - shoulderWidth, shoulderY);
  ctx.lineTo(centerX + shoulderWidth, shoulderY);
  ctx.stroke();

  for (const hand of handPositions) {
    const shoulderX = hand.x < centerX ? centerX - shoulderWidth : centerX + shoulderWidth;

    const elbowX = (shoulderX + hand.x) / 2;
    const elbowY = (shoulderY + hand.y) / 2 + eh * ELBOW_OFFSET_RATIO;

    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
  }
};

/**
 * Draw a single ball as a filled circle.
 *
 * The ball radius scales proportionally with the canvas width.
 * Useful in custom render functions when you want to keep the default ball appearance.
 *
 * @param ctx - The 2D rendering context of the canvas.
 * @param canvasWidth - Canvas width in pixels (used to scale the ball radius).
 * @param position - Center position of the ball in canvas coordinates.
 * @param color - CSS color string for the ball fill.
 */
export const drawBall = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  position: Vec2,
  color: string,
) => {
  const radius = canvasWidth * BALL_RADIUS_RATIO;

  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

/**
 * Draw a single hand as a semi-circular arc (palm-up).
 *
 * The hand size scales proportionally with the canvas width.
 * Useful in custom render functions when you want to keep the default hand appearance.
 *
 * @param ctx - The 2D rendering context of the canvas.
 * @param canvasWidth - Canvas width in pixels (used to scale the hand size).
 * @param position - Center position of the hand in canvas coordinates.
 */
export const drawHand = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  position: Vec2,
  foreground = DEFAULT_FOREGROUND,
) => {
  const size = canvasWidth * HAND_SIZE_RATIO;

  ctx.strokeStyle = foreground;
  ctx.lineWidth = HAND_LINE_WIDTH;
  ctx.beginPath();
  ctx.arc(position.x, position.y, size, 0, Math.PI, false);
  ctx.stroke();
};
