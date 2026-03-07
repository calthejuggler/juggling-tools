import { computeInitialState, numBalls } from "./siteswap.js";

export type ThrowEvent = {
  readonly ballId: number;
  readonly fromHand: number;
  readonly toHand: number;
  readonly throwValue: number;
  readonly throwBeat: number;
};

export type BallSchedule = {
  readonly id: number;
  readonly color: string;
  readonly throwEvents: readonly ThrowEvent[];
};

export const computeSchedule = (
  siteswap: number[],
  numHands: number,
  targetBeat: number,
  colors: readonly string[],
  existing?: readonly BallSchedule[],
) => {
  const count = numBalls(siteswap);
  const startBeat = existing ? findComputedUpToBeat(existing) + 1 : 0;

  const balls: { id: number; color: string; throwEvents: ThrowEvent[] }[] = existing
    ? existing.map((b) => ({
        id: b.id,
        color: b.color,
        throwEvents: [...b.throwEvents],
      }))
    : Array.from({ length: count }, (_, i) => ({
        id: i,
        color: colors[i % colors.length],
        throwEvents: [],
      }));

  const handQueues = new Map<number, number[]>();
  for (let handIndex = 0; handIndex < numHands; handIndex++) {
    handQueues.set(handIndex, []);
  }
  const pendingLandings = new Map<number, number[]>();

  if (existing) {
    rebuildState(existing, startBeat, numHands, handQueues, pendingLandings);
  } else {
    const state = computeInitialState(siteswap);
    state.reduce((ballIdx, occupied, beat) => {
      if (!occupied) return ballIdx;
      handQueues.get(beat % numHands)!.push(ballIdx);
      return ballIdx + 1;
    }, 0);
  }

  for (let beat = startBeat; beat <= targetBeat; beat++) {
    processBeat(beat, siteswap, numHands, balls, handQueues, pendingLandings);
  }

  return balls;
};

const findComputedUpToBeat = (balls: readonly BallSchedule[]) =>
  balls.reduce(
    (max, ball) => ball.throwEvents.reduce((m, event) => Math.max(m, event.throwBeat), max),
    -1,
  );

const rebuildState = (
  balls: readonly BallSchedule[],
  nextBeat: number,
  numHands: number,
  handQueues: Map<number, number[]>,
  pendingLandings: Map<number, number[]>,
) => {
  for (const ball of balls) {
    const lastEvent = ball.throwEvents[ball.throwEvents.length - 1];
    if (!lastEvent) {
      const firstEvent = ball.throwEvents[0];
      if (firstEvent) {
        handQueues.get(firstEvent.fromHand)!.push(ball.id);
      }
      continue;
    }

    const landingBeat = lastEvent.throwBeat + lastEvent.throwValue;
    if (landingBeat < nextBeat) {
      const hand = landingBeat % numHands;
      handQueues.get(hand)!.push(ball.id);
    } else {
      if (!pendingLandings.has(landingBeat)) {
        pendingLandings.set(landingBeat, []);
      }
      pendingLandings.get(landingBeat)!.push(ball.id);
    }
  }
};

const processBeat = (
  beat: number,
  siteswap: number[],
  numHands: number,
  balls: { id: number; color: string; throwEvents: ThrowEvent[] }[],
  handQueues: Map<number, number[]>,
  pendingLandings: Map<number, number[]>,
) => {
  const landings = pendingLandings.get(beat);
  if (landings) {
    const hand = beat % numHands;
    const queue = handQueues.get(hand)!;
    for (const ballId of landings) {
      queue.push(ballId);
    }
    pendingLandings.delete(beat);
  }

  const throwValue = siteswap[beat % siteswap.length];
  const fromHand = beat % numHands;

  if (throwValue === 0) return;

  const queue = handQueues.get(fromHand)!;
  if (queue.length === 0) return;

  const ballId = queue.shift()!;
  const toHand = (beat + throwValue) % numHands;
  const landingBeat = beat + throwValue;

  balls[ballId].throwEvents.push({
    ballId,
    fromHand,
    toHand,
    throwValue,
    throwBeat: beat,
  });

  if (!pendingLandings.has(landingBeat)) {
    pendingLandings.set(landingBeat, []);
  }
  pendingLandings.get(landingBeat)!.push(ballId);
};
