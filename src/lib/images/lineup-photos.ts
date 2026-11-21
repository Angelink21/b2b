import {
  LINEUP_PHOTO_MIN,
  type LineupModel,
} from "@/lib/catalog/lineup";

import { getImagesManifest } from "./manifest";

/** Max allowed |photo AR − catalog W/H| / (W/H) for hero lineup photos. */
export const LINEUP_ASPECT_MAX_DEVIATION_PCT = 8;

export function photoAspectDeviationPct(
  photoW: number,
  photoH: number,
  dimW: number,
  dimH: number,
): number {
  if (photoH <= 0 || dimH <= 0) return Number.POSITIVE_INFINITY;
  const photoRatio = photoW / photoH;
  const dimRatio = dimW / dimH;
  return (Math.abs(photoRatio - dimRatio) / dimRatio) * 100;
}

/**
 * Hero floor row uses Cloudinary photos when enough lineup slots have 12B assets.
 */
export function canUseLineupPhotos(
  lineup: readonly LineupModel[],
  hasPhoto?: (slug: string) => boolean,
): boolean {
  if (lineup.length === 0) return false;
  const manifest = getImagesManifest();
  if (!manifest.cloudName) return false;

  const check =
    hasPhoto ??
    ((slug: string) => {
      const entry = manifest.images[slug];
      return Boolean(entry && entry.width > 1 && entry.height > 1);
    });

  const photoSlots = lineup.filter((m) => check(m.slug)).length;
  return photoSlots >= LINEUP_PHOTO_MIN && lineup.every((m) => check(m.slug));
}
