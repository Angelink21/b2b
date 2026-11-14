"use client";

import { useReducedMotion } from "motion/react";

import { isExpressive, MOTION_LEVEL, type MotionLevel } from "@/config/motion";

export type MotionGate = {
  level: MotionLevel;
  /** Any motion allowed (not prefers-reduced-motion). */
  enabled: boolean;
  /** Expressive features (drag lift, VT, etc.). */
  expressive: boolean;
  reduced: boolean;
};

/**
 * Gate for stage-8 animations. Respects MOTION_LEVEL and prefers-reduced-motion.
 */
export function useMotionEnabled(): MotionGate {
  const reduced = useReducedMotion() === true;
  const enabled = !reduced;
  return {
    level: MOTION_LEVEL,
    enabled,
    expressive: enabled && isExpressive(),
    reduced,
  };
}
