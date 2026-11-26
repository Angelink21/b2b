import { serializeCompareSlugs } from "@/lib/catalog/compare";

import {
  COMPARE_STORAGE_KEY,
  normalizeSlugs,
  parseCompareQuery,
  readCompareSlugsFromStorage,
  resolveInitialSlugs,
  writeCompareSlugsToStorage,
} from "./selection";

type Listener = () => void;

let slugs: string[] = [];
let ready = false;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function isComparePath(pathname: string): boolean {
  return /\/compare\/?$/.test(pathname);
}

function syncCompareUrl(next: readonly string[]) {
  if (typeof window === "undefined") return;
  if (!isComparePath(window.location.pathname)) return;
  const url = new URL(window.location.href);
  if (next.length === 0) url.searchParams.delete("m");
  else url.searchParams.set("m", serializeCompareSlugs(next));
  const href = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (href !== current) {
    window.history.replaceState(window.history.state, "", href);
  }
}

export function subscribeCompareStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCompareSlugsSnapshot(): string[] {
  return slugs;
}

export function getCompareReadySnapshot(): boolean {
  return ready;
}

/** Stable identity for useSyncExternalStore server snapshot (never allocate). */
const SERVER_COMPARE_SLUGS: string[] = [];

export function getServerCompareSlugsSnapshot(): string[] {
  return SERVER_COMPARE_SLUGS;
}

export function getServerCompareReadySnapshot(): boolean {
  return false;
}

/**
 * Bootstrap / refresh from URL + localStorage.
 * `/compare?m=` always wins when present (deep links, shared URLs).
 */
export function initCompareStore(): void {
  if (typeof window === "undefined") return;

  const pathname = window.location.pathname;
  const search = window.location.search;
  const onCompare = isComparePath(pathname);
  const fromUrl = parseCompareQuery(new URLSearchParams(search).get("m"));

  if (onCompare && fromUrl.length > 0) {
    slugs = fromUrl;
    ready = true;
    writeCompareSlugsToStorage(slugs, window.localStorage);
    emit();
    return;
  }

  if (!ready) {
    slugs = resolveInitialSlugs({
      pathname,
      search,
      storage: window.localStorage,
    });
    ready = true;
    writeCompareSlugsToStorage(slugs, window.localStorage);
    emit();
  }
}

export function setCompareSlugs(next: readonly string[]): string[] {
  const normalized = normalizeSlugs(next);
  slugs = normalized;
  ready = true;
  if (typeof window !== "undefined") {
    writeCompareSlugsToStorage(normalized, window.localStorage);
    syncCompareUrl(normalized);
  }
  emit();
  return normalized;
}

export function bindCompareStorageListener(): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key !== COMPARE_STORAGE_KEY) return;
    slugs = readCompareSlugsFromStorage(window.localStorage);
    ready = true;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
