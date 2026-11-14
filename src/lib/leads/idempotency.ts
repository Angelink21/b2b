import type { LeadFormState } from "./types";

type Entry = { state: LeadFormState; expiresAt: number };

const store = new Map<string, Entry>();
const TTL_MS = 15 * 60 * 1000;

function prune(now: number): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

export function getIdempotentResult(key: string): LeadFormState | null {
  const now = Date.now();
  prune(now);
  const entry = store.get(key);
  if (!entry || entry.expiresAt <= now) return null;
  return entry.state;
}

export function rememberIdempotentResult(
  key: string,
  state: LeadFormState,
): void {
  const now = Date.now();
  prune(now);
  store.set(key, { state, expiresAt: now + TTL_MS });
}

export function resetIdempotencyStore(): void {
  store.clear();
}
