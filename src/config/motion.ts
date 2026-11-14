/**
 * Motion level for the site.
 * - `signature` — load intro on the home lineup only
 * - `expressive` — full stage-8 set (drag, hover, VT, drawing, table, scroll, micro)
 */
export type MotionLevel = "signature" | "expressive";

export const MOTION_LEVEL: MotionLevel = "expressive";

export function isExpressive(): boolean {
  return MOTION_LEVEL === "expressive";
}

/** Mirrors docs/DESIGN.md Motion tokens (ms). */
export const MOTION_MS = {
  fast: 120,
  base: 200,
  slow: 400,
  signature: 1100,
  machine: 420,
  scale: 500,
  labelDelay: 150,
  press: 100,
} as const;

export const MOTION_EASE = {
  standard: [0.2, 0, 0, 1] as const,
  emphasized: [0.16, 1, 0.3, 1] as const,
};

export const MACHINE_STAGGER_MS = 60;
export const INTRO_BUDGET_MS = 1400;
export const MACHINE_LIFT_PX = 8;
export const MAGNET_THRESHOLD_UNITS = 18;
