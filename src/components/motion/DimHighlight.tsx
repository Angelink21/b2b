"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DimHighlightKind = "width" | "height" | "both" | null;

type DimHighlightContextValue = {
  active: DimHighlightKind;
  setActive: (next: DimHighlightKind) => void;
};

const DimHighlightContext = createContext<DimHighlightContextValue | null>(
  null,
);

export function DimHighlightProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<DimHighlightKind>(null);
  const setActive = useCallback((next: DimHighlightKind) => {
    setActiveState(next);
  }, []);
  const value = useMemo(
    () => ({ active, setActive }),
    [active, setActive],
  );
  return (
    <DimHighlightContext.Provider value={value}>
      {children}
    </DimHighlightContext.Provider>
  );
}

export function useDimHighlight(): DimHighlightContextValue {
  const ctx = useContext(DimHighlightContext);
  if (!ctx) {
    return {
      active: null,
      setActive: () => undefined,
    };
  }
  return ctx;
}
