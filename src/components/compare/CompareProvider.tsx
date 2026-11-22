"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { CategorySlug } from "@/lib/catalog/schema";
import {
  COMPARE_MAX,
  addSlug,
  removeSlug,
  toggleSlug,
} from "@/lib/compare/selection";
import {
  bindCompareStorageListener,
  getCompareReadySnapshot,
  getCompareSlugsSnapshot,
  getServerCompareReadySnapshot,
  getServerCompareSlugsSnapshot,
  initCompareStore,
  setCompareSlugs,
  subscribeCompareStore,
} from "@/lib/compare/store";

export type CompareTrayItem = {
  slug: string;
  name: string;
  category: CategorySlug;
  thumbSrc: string | null;
  thumbW: number;
  thumbH: number;
};

type ToastState = { name: string } | null;

type CompareContextValue = {
  selected: string[];
  ready: boolean;
  isFull: boolean;
  max: number;
  toast: ToastState;
  limitHint: boolean;
  itemsBySlug: Record<string, CompareTrayItem>;
  isSelected: (slug: string) => boolean;
  add: (slug: string) => void;
  remove: (slug: string) => void;
  toggle: (slug: string) => void;
  clear: () => void;
  dismissToast: () => void;
  dismissLimitHint: () => void;
  showLimitHint: () => void;
};

const CompareContext = createContext<CompareContextValue | null>(null);

type CompareProviderProps = {
  children: ReactNode;
  itemsBySlug: Record<string, CompareTrayItem>;
};

export function CompareProvider({
  children,
  itemsBySlug,
}: CompareProviderProps) {
  const selected = useSyncExternalStore(
    subscribeCompareStore,
    getCompareSlugsSnapshot,
    getServerCompareSlugsSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeCompareStore,
    getCompareReadySnapshot,
    getServerCompareReadySnapshot,
  );

  const [toast, setToast] = useState<ToastState>(null);
  const [limitHint, setLimitHint] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const limitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    initCompareStore();
    document.body.dataset.compareReady = "true";
    const onPopState = () => {
      initCompareStore();
    };
    window.addEventListener("popstate", onPopState);
    const unbindStorage = bindCompareStorageListener();
    return () => {
      delete document.body.dataset.compareReady;
      window.removeEventListener("popstate", onPopState);
      unbindStorage();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (limitTimerRef.current !== null) {
        window.clearTimeout(limitTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((name: string) => {
    setToast({ name });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  const showLimitHint = useCallback(() => {
    setLimitHint(true);
    if (limitTimerRef.current !== null) {
      window.clearTimeout(limitTimerRef.current);
    }
    limitTimerRef.current = window.setTimeout(() => {
      setLimitHint(false);
      limitTimerRef.current = null;
    }, 4000);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);
  const dismissLimitHint = useCallback(() => setLimitHint(false), []);

  const isSelected = useCallback(
    (slug: string) => selected.includes(slug),
    [selected],
  );

  const add = useCallback(
    (slug: string) => {
      const result = addSlug(getCompareSlugsSnapshot(), slug);
      if (result.kind === "limit") {
        showLimitHint();
        return;
      }
      setCompareSlugs(result.slugs);
      if (result.kind === "added") {
        const name = itemsBySlug[result.added]?.name ?? result.added;
        showToast(name);
      }
    },
    [itemsBySlug, showLimitHint, showToast],
  );

  const remove = useCallback((slug: string) => {
    setCompareSlugs(removeSlug(getCompareSlugsSnapshot(), slug));
  }, []);

  const toggle = useCallback(
    (slug: string) => {
      const result = toggleSlug(getCompareSlugsSnapshot(), slug);
      if (result.kind === "limit") {
        showLimitHint();
        return;
      }
      setCompareSlugs(result.slugs);
      if (result.kind === "added") {
        const name = itemsBySlug[result.added]?.name ?? result.added;
        showToast(name);
      }
    },
    [itemsBySlug, showLimitHint, showToast],
  );

  const clear = useCallback(() => {
    setCompareSlugs([]);
  }, []);

  const value = useMemo<CompareContextValue>(
    () => ({
      selected,
      ready,
      isFull: selected.length >= COMPARE_MAX,
      max: COMPARE_MAX,
      toast,
      limitHint,
      itemsBySlug,
      isSelected,
      add,
      remove,
      toggle,
      clear,
      dismissToast,
      dismissLimitHint,
      showLimitHint,
    }),
    [
      add,
      clear,
      dismissLimitHint,
      dismissToast,
      isSelected,
      itemsBySlug,
      limitHint,
      ready,
      remove,
      selected,
      showLimitHint,
      toast,
      toggle,
    ],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompareContext(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompareContext must be used within CompareProvider");
  }
  return ctx;
}
