"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { useMotionEnabled } from "@/components/motion/useMotionEnabled";
import {
  MACHINE_LIFT_PX,
  MACHINE_STAGGER_MS,
  MOTION_EASE,
  MOTION_MS,
} from "@/config/motion";
import { isLineupMachineInRange } from "@/lib/catalog/lineup";

import { useLineupRange } from "./LineupContext";

export function LineupMachineSlot({
  kgMax,
  index,
  caption,
  children,
}: {
  kgMax: number;
  index: number;
  caption: string;
  children: ReactNode;
}) {
  const {
    loKg,
    hiKg,
    fullRange,
    liftActive,
    introReady,
    playMachineIntro,
    setHoveredKg,
  } = useLineupRange();
  const { enabled, expressive } = useMotionEnabled();
  const on = isLineupMachineInRange(kgMax, loKg, hiKg, fullRange);
  const runIntro = Boolean(enabled && playMachineIntro);

  // motion: in-range machines lift 8px while the load window is narrowed
  const liftY = expressive && liftActive && on ? -MACHINE_LIFT_PX : 0;
  const targetY = runIntro && !introReady ? 0 : liftY;

  return (
    <motion.div
      className={`lineup-machine${on ? " is-on" : ""}${liftActive && on ? " is-lifted" : ""}`}
      data-kg={kgMax}
      role={expressive ? "img" : undefined}
      tabIndex={expressive ? 0 : undefined}
      aria-label={expressive ? caption : undefined}
      // motion: machines settle onto the floor line once per session
      initial={runIntro ? { y: 12, opacity: 0 } : false}
      animate={{
        y: targetY,
        opacity: on ? 1 : 0.32,
      }}
      transition={{
        y: {
          duration: runIntro && !introReady
            ? MOTION_MS.machine / 1000
            : expressive
              ? MOTION_MS.base / 1000
              : 0,
          ease: MOTION_EASE.emphasized,
          delay:
            runIntro && !introReady
              ? (index * MACHINE_STAGGER_MS) / 1000
              : 0,
        },
        opacity: {
          duration:
            runIntro || expressive ? MOTION_MS.machine / 1000 : 0,
          ease: MOTION_EASE.emphasized,
          delay:
            runIntro && !introReady
              ? (index * MACHINE_STAGGER_MS) / 1000
              : 0,
        },
      }}
      onMouseEnter={() => {
        if (expressive) setHoveredKg(kgMax);
      }}
      onMouseLeave={() => {
        if (expressive) setHoveredKg(null);
      }}
      onFocus={() => {
        if (expressive) setHoveredKg(kgMax);
      }}
      onBlur={() => {
        if (expressive) setHoveredKg(null);
      }}
    >
      {children}
      {expressive ? (
        <span className="lineup-machine-caption" aria-hidden="true">
          {caption}
        </span>
      ) : null}
    </motion.div>
  );
}
