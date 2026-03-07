import { useState } from "react";

import {
  Simulator,
  useSimulator,
  type BallRenderFn,
  type HandRenderFn,
  type JugglerRenderFn,
} from "@juggling-tools/simulator-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Controls = () => {
  const { start, stop, isRunning, setSiteswap, siteswap, error } = useSimulator();
  const [input, setInput] = useState(siteswap);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        className="border-neutral-700 bg-neutral-900 text-white"
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setSiteswap(input);
          }}
        />
        <Button onClick={() => setSiteswap(input)}>Set</Button>
        <Button variant="secondary" onClick={isRunning ? stop : start}>
          {isRunning ? "Pause" : "Play"}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error.message}</p>}
    </div>
  );
};

const drawGlowBall: BallRenderFn = ({ ctx, position, color, canvasWidth }) => {
  const r = canvasWidth * 0.032;
  const gradient = ctx.createRadialGradient(
    position.x,
    position.y,
    0,
    position.x,
    position.y,
    r * 2.5,
  );
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.4, color + "aa");
  gradient.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(position.x, position.y, r * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(position.x, position.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

const drawSquareBall: BallRenderFn = ({ ctx, position, color, canvasWidth }) => {
  const size = canvasWidth * 0.05;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate((performance.now() % (Math.PI * 2 * 300)) / 300);
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
};

const drawDiamondHand: HandRenderFn = ({ ctx, position, canvasWidth }) => {
  const size = canvasWidth * 0.02;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = "rgba(255, 200, 100, 0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-size, -size, size * 2, size * 2);
  ctx.restore();
};

const drawStickFigure: JugglerRenderFn = ({ ctx, width, height, handPositions }) => {
  const cx = width / 2;
  const headY = height * 0.68;
  const headR = width * 0.04;

  ctx.strokeStyle = "rgba(100, 200, 255, 0.7)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(100, 200, 255, 0.15)";
  ctx.fill();

  const neckY = headY + headR;
  const hipY = height * 1.0;

  ctx.beginPath();
  ctx.moveTo(cx, neckY);
  ctx.lineTo(cx, hipY);
  ctx.stroke();

  const shoulderY = neckY + height * 0.03;
  for (const hand of handPositions) {
    const shoulderX = hand.x < cx ? cx - width * 0.1 : cx + width * 0.1;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.quadraticCurveTo((shoulderX + hand.x) / 2, (shoulderY + hand.y) / 2 + 20, hand.x, hand.y);
    ctx.stroke();
  }
};

export const SimulatorPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-neutral-950 p-8">
      <h1 className="text-2xl font-bold text-white">Simulator Demo</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-400">Minimal (defaults)</h2>
          <Simulator.Root siteswap="3">
            <Simulator.Canvas width={300} height={420} className="rounded-xl" />
          </Simulator.Root>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-400">Compositional (531)</h2>
          <Simulator.Root siteswap="531" beatDuration={400} background="#1a1a2e">
            <Simulator.Canvas width={300} height={420} className="rounded-xl">
              <Simulator.Juggler />
              <Simulator.Hands />
              <Simulator.Ball color="#ef4444" />
              <Simulator.Ball color="#22c55e" />
              <Simulator.Ball color="#3b82f6" />
            </Simulator.Canvas>
          </Simulator.Root>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-400">Ball cycling (97531)</h2>
          <Simulator.Root siteswap="97531">
            <Simulator.Canvas width={300} height={420} className="rounded-xl">
              <Simulator.Juggler />
              <Simulator.Hands />
              <Simulator.Ball color="#eab308" />
              <Simulator.Ball color="#a855f7" />
            </Simulator.Canvas>
          </Simulator.Root>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-400">Custom balls (glow)</h2>
          <Simulator.Root siteswap="531" background="#0a0a1a">
            <Simulator.Canvas width={300} height={420} className="rounded-xl">
              <Simulator.Juggler />
              <Simulator.Hands />
              <Simulator.Ball color="#ff6b6b">{drawGlowBall}</Simulator.Ball>
              <Simulator.Ball color="#4ecdc4">{drawGlowBall}</Simulator.Ball>
              <Simulator.Ball color="#ffe66d">{drawGlowBall}</Simulator.Ball>
            </Simulator.Canvas>
          </Simulator.Root>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-400">Custom balls (spinning squares)</h2>
          <Simulator.Root siteswap="744" background="#1a0a2e">
            <Simulator.Canvas width={300} height={420} className="rounded-xl">
              <Simulator.Juggler />
              <Simulator.Hands />
              <Simulator.Ball color="#f472b6">{drawSquareBall}</Simulator.Ball>
              <Simulator.Ball color="#38bdf8">{drawSquareBall}</Simulator.Ball>
              <Simulator.Ball color="#a3e635">{drawSquareBall}</Simulator.Ball>
              <Simulator.Ball color="#fb923c">{drawSquareBall}</Simulator.Ball>
              <Simulator.Ball color="#c084fc">{drawSquareBall}</Simulator.Ball>
            </Simulator.Canvas>
          </Simulator.Root>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-400">Custom juggler + hands</h2>
          <Simulator.Root siteswap="531" background="#0f1729">
            <Simulator.Canvas width={300} height={420} className="rounded-xl">
              <Simulator.Juggler>{drawStickFigure}</Simulator.Juggler>
              <Simulator.Hands>
                <Simulator.Hand>{drawDiamondHand}</Simulator.Hand>
              </Simulator.Hands>
              <Simulator.Ball color="#f87171" />
              <Simulator.Ball color="#34d399" />
              <Simulator.Ball color="#60a5fa" />
            </Simulator.Canvas>
          </Simulator.Root>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-400">With controls (hook)</h2>
          <Simulator.Root siteswap="744" autoStart>
            <Simulator.Canvas width={300} height={420} className="rounded-xl">
              <Simulator.Juggler />
              <Simulator.Hands />
              <Simulator.Ball color="#ec4899" />
              <Simulator.Ball color="#06b6d4" />
              <Simulator.Ball color="#f97316" />
            </Simulator.Canvas>
            <Controls />
          </Simulator.Root>
        </div>
      </div>
    </div>
  );
};
