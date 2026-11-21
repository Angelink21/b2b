/**
 * Catalog status payload for GET /api/catalog-status.
 * Runtime fields come from `getCatalog().meta` — never from module side-state.
 */

import { timingSafeEqual } from "node:crypto";

import type { CatalogRuntimeMeta, CatalogRuntimeResult } from "./runtime";

export type CatalogBuildStatus = {
  builtAt: string;
  modelCount: number;
  source: string;
};

export type CatalogRuntimeStatus = {
  lastFetchAt: string;
  runtimeSource: "sheet" | "snapshot";
  runtimeModelCount: number;
  lastErrors: string[];
};

export type CatalogStatusPayload = {
  build: CatalogBuildStatus;
  runtime: CatalogRuntimeStatus;
};

export type CatalogStatusAuth =
  | { ok: true }
  | { ok: false; status: 401 | 404 };

/** Unset secret → 404 (route hidden). Wrong/missing Bearer → 401. */
export function authorizeCatalogStatus(
  authorizationHeader: string | null,
  secret: string | null,
): CatalogStatusAuth {
  if (!secret) {
    return { ok: false, status: 404 };
  }

  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() ?? "";
  if (!token || !safeEqualString(token, secret)) {
    return { ok: false, status: 401 };
  }

  return { ok: true };
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function runtimeStatusFromMeta(
  meta: CatalogRuntimeMeta,
): CatalogRuntimeStatus {
  return {
    lastFetchAt: meta.fetchedAt,
    runtimeSource: meta.source,
    runtimeModelCount: meta.modelCount,
    lastErrors: [...meta.errors],
  };
}

export function buildCatalogStatusPayload(
  build: CatalogBuildStatus,
  catalog: CatalogRuntimeResult,
): CatalogStatusPayload {
  return {
    build: {
      builtAt: build.builtAt,
      modelCount: build.modelCount,
      source: build.source,
    },
    runtime: runtimeStatusFromMeta(catalog.meta),
  };
}
