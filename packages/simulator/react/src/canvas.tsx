import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";

import { drawBall, drawHand, drawJuggler } from "@juggling-tools/simulator";
import type { FrameData } from "@juggling-tools/simulator";

import { Ball, type BallConfig } from "./ball.js";
import { useSimulatorContext } from "./context.js";
import { Hand, Hands, type HandConfig, type HandsConfig } from "./hands.js";
import { Juggler, type JugglerConfig } from "./juggler.js";

type RenderConfig = {
  juggler: JugglerConfig | null;
  hands: HandsConfig | null;
  balls: BallConfig[];
};

type CanvasProps = Omit<ComponentPropsWithoutRef<"canvas">, "ref"> & {
  children?: React.ReactNode;
};

const renderWithConfig = (
  renderConfigRef: React.RefObject<RenderConfig>,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: FrameData,
) => {
  const rc = renderConfigRef.current;

  ctx.fillStyle = frame.background;
  ctx.fillRect(0, 0, w, h);

  if (rc.juggler) {
    if (rc.juggler.render) {
      rc.juggler.render({ ctx, width: w, height: h, handPositions: frame.handPositions });
    } else {
      drawJuggler(ctx, w, h, frame.handPositions);
    }
  }

  if (rc.hands) {
    const handCount = frame.handPositions.length;
    const renderers = rc.hands.handRenderers;
    for (let i = 0; i < handCount; i++) {
      const position = frame.handPositions[i];
      if (renderers.length > 0) {
        const renderer = renderers[i % renderers.length];
        if (renderer.render) {
          renderer.render({ ctx, position, canvasWidth: w });
        } else {
          drawHand(ctx, w, position);
        }
      } else {
        drawHand(ctx, w, position);
      }
    }
  }

  if (rc.balls.length > 0) {
    for (let i = 0; i < frame.balls.length; i++) {
      const ballData = frame.balls[i];
      const ballConfig = rc.balls[i % rc.balls.length];
      if (ballConfig.render) {
        ballConfig.render({
          ctx,
          position: ballData.position,
          color: ballConfig.color,
          canvasWidth: w,
        });
      } else {
        drawBall(ctx, w, ballData.position, ballConfig.color);
      }
    }
  }
};

export const Canvas = ({ children, width, height, ...canvasProps }: CanvasProps) => {
  const { simulator, registerCanvas } = useSimulatorContext();
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const renderConfigRef = useRef<RenderConfig>({ juggler: null, hands: null, balls: [] });

  const config: RenderConfig = { juggler: null, hands: null, balls: [] };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Juggler) {
      const props = child.props as { children?: JugglerConfig["render"] };
      config.juggler = { render: props.children };
    }
    if (child.type === Ball) {
      const props = child.props as { color: string; children?: BallConfig["render"] };
      config.balls.push({ color: props.color, render: props.children });
    }
    if (child.type === Hands) {
      const props = child.props as { count?: number; children?: React.ReactNode };
      const handRenderers: HandConfig[] = [];
      Children.forEach(props.children, (handChild) => {
        if (isValidElement(handChild) && handChild.type === Hand) {
          const handProps = handChild.props as { children?: HandConfig["render"] };
          handRenderers.push({ render: handProps.children });
        }
      });
      config.hands = { count: props.count ?? 2, handRenderers };
    }
  });
  renderConfigRef.current = config;

  const hasVisuals = config.juggler !== null || config.hands !== null || config.balls.length > 0;
  const handsCount = config.hands?.count ?? null;
  const ballColorKey = config.balls.map((b) => b.color).join(",");

  const canvasRefCallback = useCallback(
    (el: HTMLCanvasElement | null) => {
      if (!el) return;
      canvasElRef.current = el;
      registerCanvas(el);
    },
    [registerCanvas],
  );

  useEffect(() => {
    if (handsCount !== null) simulator?.setNumHands(handsCount);
  }, [handsCount, simulator]);

  useEffect(() => {
    if (!simulator) return;

    if (!hasVisuals) {
      simulator.setRender(undefined);
      return;
    }

    simulator.setRender((ctx, w, h, frame) => renderWithConfig(renderConfigRef, ctx, w, h, frame));
  }, [hasVisuals, simulator]);

  useEffect(() => {
    if (!simulator || !hasVisuals) return;

    simulator.setColors(ballColorKey ? ballColorKey.split(",") : []);
  }, [ballColorKey, hasVisuals, simulator]);

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el || width !== undefined || height !== undefined) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: w, height: h } = entry.contentRect;
      el.width = w;
      el.height = h;
      simulator?.resize();
    });

    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [width, height, simulator]);

  return <canvas ref={canvasRefCallback} width={width} height={height} {...canvasProps} />;
};
