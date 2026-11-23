"use client";

import { motion } from "motion/react";
import {
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { useMotionEnabled } from "@/components/motion/useMotionEnabled";
import {
  MACHINE_LIFT_PX,
  MACHINE_STAGGER_MS,
  MOTION_EASE,
  MOTION_MS,
} from "@/config/motion";
import { Link } from "@/i18n/navigation";
import { isLineupMachineInRange } from "@/lib/catalog/lineup";

import { useLineupRange } from "./LineupContext";

function isHintPointer(pointerType: string): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}

function moveThresholdPx(pointerType: string): number {
  return pointerType === "touch" ? 10 : 5;
}

export function LineupMachineSlot({
  kgMax,
  index,
  href,
  label,
  children,
}: {
  kgMax: number;
  index: number;
  href: string;
  /** Accessible name: model + load (from i18n). */
  label: string;
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
  const suppressClickRef = useRef(false);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    threshold: number;
    moved: boolean;
  } | null>(null);

  // motion: in-range machines lift 8px while the load window is narrowed
  const liftY = expressive && liftActive && on ? -MACHINE_LIFT_PX : 0;
  const targetY = runIntro && !introReady ? 0 : liftY;

  function onPointerDown(event: ReactPointerEvent<HTMLAnchorElement>) {
    const threshold = moveThresholdPx(event.pointerType);
    const gesture = {
      startX: event.clientX,
      startY: event.clientY,
      threshold,
      moved: false,
    };
    gestureRef.current = gesture;
    suppressClickRef.current = false;

    const onMove = (pointer: PointerEvent) => {
      const g = gestureRef.current;
      if (!g || g.moved) return;
      const dist = Math.hypot(
        pointer.clientX - g.startX,
        pointer.clientY - g.startY,
      );
      if (dist > g.threshold) {
        g.moved = true;
        suppressClickRef.current = true;
      }
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      gestureRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  }

  return (
    <Link
      href={href}
      className={`lineup-machine${on ? " is-on" : ""}${liftActive && on ? " is-lifted" : ""}`}
      data-kg={kgMax}
      aria-label={label}
      onPointerEnter={(event) => {
        if (isHintPointer(event.pointerType)) setHoveredKg(kgMax);
      }}
      onPointerLeave={() => {
        setHoveredKg(null);
      }}
      onFocus={() => {
        setHoveredKg(kgMax);
      }}
      onBlur={() => {
        setHoveredKg(null);
      }}
      onPointerDown={onPointerDown}
      onClick={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          suppressClickRef.current = false;
        }
      }}
    >
      <motion.span
        className="lineup-machine-motion"
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
      >
        {children}
      </motion.span>
    </Link>
  );
}
