"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

export type LineupRangeState = {
  loUnit: number;
  hiUnit: number;
  loKg: number;
  hiKg: number;
  fullRange: boolean;
  /** Expressive: machines in range lift while the window is narrowed. */
  liftActive: boolean;
  /** Signature/expressive intro finished (or skipped). */
  introReady: boolean;
  /** Whether machine enter stagger should play. */
  playMachineIntro: boolean;
  hoveredKg: number | null;
  setHoveredKg: (kg: number | null) => void;
};

const LineupRangeContext = createContext<LineupRangeState | null>(null);

export function LineupRangeProvider({
  value,
  children,
}: {
  value: LineupRangeState;
  children: ReactNode;
}) {
  return (
    <LineupRangeContext.Provider value={value}>
      {children}
    </LineupRangeContext.Provider>
  );
}

export function useLineupRange(): LineupRangeState {
  const ctx = useContext(LineupRangeContext);
  if (!ctx) {
    throw new Error("useLineupRange must be used within LineupRangeProvider");
  }
  return ctx;
}
