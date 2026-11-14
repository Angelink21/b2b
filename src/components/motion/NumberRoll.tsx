"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { MOTION_EASE, MOTION_MS } from "@/config/motion";

type NumberRollProps = {
  value: number;
  className?: string;
};

/**
 * // motion: model count digits roll vertically when the lineup range changes
 */
export function NumberRoll({ value, className = "" }: NumberRollProps) {
  const reduced = useReducedMotion() === true;

  if (reduced) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={`number-roll ${className}`.trim()}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="number-roll-digit"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{
            duration: MOTION_MS.base / 1000,
            ease: MOTION_EASE.emphasized,
          }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
