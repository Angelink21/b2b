/**
 * Cached Cloudinary probe for runtime getModelImage.
 * Import only from server code — uses `'use cache'`.
 */

import { cacheLife } from "next/cache";

import { getEnv } from "@/env";

import { probeCloudinaryPublicId } from "./probe";
import type { ModelImageEntry } from "./types";

const DEFAULT_IMAGES_CACHE_REVALIDATE_SECONDS = 300;

export function readImagesCacheRevalidateSeconds(): number {
  const raw = process.env.IMAGES_CACHE_REVALIDATE_SECONDS;
  if (!raw) return DEFAULT_IMAGES_CACHE_REVALIDATE_SECONDS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1
    ? n
    : DEFAULT_IMAGES_CACHE_REVALIDATE_SECONDS;
}

/**
 * Probe one public_id with Next cache. Misses are cached as null so we do not
 * re-HEAD on every request within the TTL.
 */
export async function probeCloudinaryPublicIdCached(
  cloudName: string,
  publicId: string,
): Promise<ModelImageEntry | null> {
  "use cache";
  const revalidate = readImagesCacheRevalidateSeconds();
  const expire =
    revalidate < 60
      ? Math.max(revalidate * 2, 60)
      : Math.max(revalidate * 2, 3600);
  cacheLife({
    stale: revalidate,
    revalidate,
    expire,
  });

  // Touch env so folder/cloud changes invalidate with deploy, not mid-TTL.
  void getEnv().CLOUDINARY_CLOUD_NAME;
  return probeCloudinaryPublicId(cloudName, publicId);
}
