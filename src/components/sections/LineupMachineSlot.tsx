"use client";

import type { ReactNode } from "react";

import {
  isLineupMachineInRange,
} from "@/lib/catalog/lineup";

import { useLineupRange } from "./LineupContext";

export function LineupMachineSlot({
  kgMax,
  children,
}: {
  kgMax: number;
  children: ReactNode;
}) {
  const { loKg, hiKg, fullRange } = useLineupRange();
  const on = isLineupMachineInRange(kgMax, loKg, hiKg, fullRange);

  return (
    <div
      className={`lineup-machine${on ? " is-on" : ""}`}
      data-kg={kgMax}
    >
      {children}
    </div>
  );
}
