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
