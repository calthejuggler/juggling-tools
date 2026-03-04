export const CELL = 40;
export const GAP = 6;
export const STEP = CELL + GAP;
export const LABEL_H = 18;
export const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 };

export const BALL_BASE_CLASS =
  "absolute top-0 left-0 flex items-center justify-center rounded-md border-2 text-xs font-bold transition-colors duration-500";
export const BALL_CLASS_DEFAULT = "border-primary bg-primary text-primary-foreground";
export const BALL_CLASS_GROUND = "border-success/80 bg-success/80 text-white";
