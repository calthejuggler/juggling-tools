import type { BallPosition } from "./physics.js";
import type { Vec2 } from "./types.js";

const HEAD_RADIUS_RATIO = 0.05;
const HEAD_Y_RATIO = 0.65;
const NECK_TO_SHOULDER_RATIO = 0.03;
const WAIST_Y_RATIO = 1.05;
const SHOULDER_WIDTH_RATIO = 0.14;
const JUGGLER_LINE_WIDTH = 2.5;
const JUGGLER_STROKE_STYLE = "rgba(255, 255, 255, 0.6)";
const ELBOW_OFFSET_RATIO = 0.04;

const BALL_RADIUS_RATIO = 0.032;

const HAND_SIZE_RATIO = 0.025;
const HAND_LINE_WIDTH = 2;
const HAND_STROKE_STYLE = "rgba(255, 255, 255, 0.4)";

export type FrameData = {
  readonly background: string;
  readonly showJuggler: boolean;
  readonly handPositions: readonly Vec2[];
  readonly balls: readonly BallPosition[];
};

export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: FrameData,
) => {
  clearCanvas(ctx, width, height, frame.background);

  if (frame.showJuggler) {
    drawJuggler(ctx, width, height, frame.handPositions);
  }

  for (const hand of frame.handPositions) {
    drawHand(ctx, width, hand);
  }

  for (const ball of frame.balls) {
    drawBall(ctx, width, ball.position, ball.color);
  }
};

const clearCanvas = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: string,
) => {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
};

export const drawJuggler = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  handPositions: readonly Vec2[],
) => {
  const centerX = width / 2;
  const headRadius = width * HEAD_RADIUS_RATIO;
  const headY = height * HEAD_Y_RATIO;
  const neckY = headY + headRadius;
  const shoulderY = neckY + height * NECK_TO_SHOULDER_RATIO;
  const waistY = height * WAIST_Y_RATIO;
  const shoulderWidth = width * SHOULDER_WIDTH_RATIO;

  ctx.strokeStyle = JUGGLER_STROKE_STYLE;
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
    const elbowY = (shoulderY + hand.y) / 2 + height * ELBOW_OFFSET_RATIO;

    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
  }
};

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

export const drawHand = (ctx: CanvasRenderingContext2D, canvasWidth: number, position: Vec2) => {
  const size = canvasWidth * HAND_SIZE_RATIO;

  ctx.strokeStyle = HAND_STROKE_STYLE;
  ctx.lineWidth = HAND_LINE_WIDTH;
  ctx.beginPath();
  ctx.arc(position.x, position.y, size, 0, Math.PI, false);
  ctx.stroke();
};
