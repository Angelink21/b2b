"use client";

import { motion, useReducedMotion } from "motion/react";

import { MOTION_EASE, MOTION_MS } from "@/config/motion";

type SuccessCheckProps = {
  className?: string;
};

/**
 * // motion: success checkmark draws in after a quote is submitted
 */
export function SuccessCheck({ className = "" }: SuccessCheckProps) {
  const reduced = useReducedMotion() === true;
  const path =
    "M4 12.5 L9.5 18 L20 6";

  if (reduced) {
    return (
      <svg
        className={`success-check ${className}`.trim()}
        viewBox="0 0 24 24"
        width={28}
        height={28}
        aria-hidden="true"
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
      </svg>
    );
  }

  return (
    <svg
      className={`success-check ${className}`.trim()}
      viewBox="0 0 24 24"
      width={28}
      height={28}
      aria-hidden="true"
    >
      <motion.path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: MOTION_MS.slow / 1000,
          ease: MOTION_EASE.emphasized,
        }}
      />
    </svg>
  );
}
