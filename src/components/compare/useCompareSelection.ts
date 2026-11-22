"use client";

import { useCompareContext } from "./CompareProvider";

/** Site-wide compare selection (context + localStorage). */
export function useCompareSelection() {
  const ctx = useCompareContext();
  return {
    selected: ctx.selected,
    add: ctx.add,
    remove: ctx.remove,
    toggle: ctx.toggle,
    clear: ctx.clear,
    isSelected: ctx.isSelected,
    isFull: ctx.isFull,
    max: ctx.max,
    ready: ctx.ready,
    showLimitHint: ctx.showLimitHint,
  };
}
