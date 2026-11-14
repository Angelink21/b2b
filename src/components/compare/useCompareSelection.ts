"use client";

import { useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";

import {
  COMPARE_MAX,
  parseAsModelSlugs,
} from "@/lib/catalog/search-params";

export function useCompareSelection() {
  const [slugs, setSlugs] = useQueryState("m", parseAsModelSlugs);

  const selected = useMemo(() => slugs ?? [], [slugs]);

  const setSelected = useCallback(
    async (next: string[]) => {
      const unique: string[] = [];
      for (const slug of next) {
        if (!unique.includes(slug)) unique.push(slug);
        if (unique.length >= COMPARE_MAX) break;
      }
      await setSlugs(unique.length > 0 ? unique : null);
    },
    [setSlugs],
  );

  const add = useCallback(
    async (slug: string) => {
      if (selected.includes(slug)) return;
      if (selected.length >= COMPARE_MAX) return;
      await setSelected([...selected, slug]);
    },
    [selected, setSelected],
  );

  const remove = useCallback(
    async (slug: string) => {
      await setSelected(selected.filter((s) => s !== slug));
    },
    [selected, setSelected],
  );

  const toggle = useCallback(
    async (slug: string) => {
      if (selected.includes(slug)) {
        await remove(slug);
        return;
      }
      await add(slug);
    },
    [add, remove, selected],
  );

  const clear = useCallback(async () => {
    await setSlugs(null);
  }, [setSlugs]);

  const isSelected = useCallback(
    (slug: string) => selected.includes(slug),
    [selected],
  );

  const isFull = selected.length >= COMPARE_MAX;

  return {
    selected,
    add,
    remove,
    toggle,
    clear,
    isSelected,
    isFull,
    max: COMPARE_MAX,
  };
}
