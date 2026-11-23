/**
 * Cloudinary public delivery probe (HEAD + fl_getinfo).
 * No Admin API. Shared by `pnpm images:sync` and runtime getModelImage.
 */

import { encodeCloudinaryPath } from "./normalize";
import type { ModelImageEntry } from "./types";

export const IMAGE_PROBE_TIMEOUT_MS = 5_000;
export const IMAGE_PROBE_MAX_RETRIES = 2;

export type ProbeFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

let fetchImpl: ProbeFetch = globalThis.fetch.bind(globalThis);

/** Test helper. Pass null to restore. */
export function __setProbeFetchForTests(next: ProbeFetch | null): void {
  fetchImpl = next ?? globalThis.fetch.bind(globalThis);
}

export function cloudinaryDeliveryUrl(
  cloudName: string,
  publicId: string,
  format = "png",
): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${encodeCloudinaryPath(publicId)}.${format}`;
}

export function cloudinaryInfoUrl(
  cloudName: string,
  publicId: string,
  transforms: string,
  format = "png",
): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${encodeCloudinaryPath(publicId)}.${format}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = IMAGE_PROBE_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function headCloudinaryOk(url: string): Promise<boolean> {
  for (let attempt = 0; attempt <= IMAGE_PROBE_MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, { method: "HEAD" });
      if (res.status === 200) return true;
      if (res.status === 404 || res.status === 420) return false;
    } catch {
      // retry
    }
    if (attempt < IMAGE_PROBE_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  return false;
}

type InfoJson = {
  input?: { width?: number; height?: number };
  output?: { width?: number; height?: number };
};

export async function fetchCloudinaryInfo(
  url: string,
): Promise<{ width: number; height: number } | null> {
  for (let attempt = 0; attempt <= IMAGE_PROBE_MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, { method: "GET" });
      if (res.ok) {
        const data = (await res.json()) as InfoJson;
        const width = data.input?.width ?? data.output?.width;
        const height = data.input?.height ?? data.output?.height;
        if (
          typeof width === "number" &&
          typeof height === "number" &&
          width > 0 &&
          height > 0
        ) {
          return { width, height };
        }
      }
    } catch {
      // retry
    }
    if (attempt < IMAGE_PROBE_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  return null;
}

/**
 * Probe one public_id. Returns entry on hit (1×1 placeholder if info fails),
 * null when the asset is missing.
 */
export async function probeCloudinaryPublicId(
  cloudName: string,
  publicId: string,
): Promise<ModelImageEntry | null> {
  const url = cloudinaryDeliveryUrl(cloudName, publicId, "png");
  const exists = await headCloudinaryOk(url);
  if (!exists) return null;

  const dims =
    (await fetchCloudinaryInfo(
      cloudinaryInfoUrl(cloudName, publicId, "fl_getinfo", "png"),
    )) ?? null;
  const trim =
    (await fetchCloudinaryInfo(
      cloudinaryInfoUrl(cloudName, publicId, "e_trim,fl_getinfo", "png"),
    )) ?? null;

  const entry: ModelImageEntry = {
    publicId,
    width: dims?.width ?? 1,
    height: dims?.height ?? 1,
  };
  if (trim) {
    entry.trimWidth = trim.width;
    entry.trimHeight = trim.height;
  }
  return entry;
}
