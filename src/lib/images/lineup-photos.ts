import type { LineupModel } from "@/lib/catalog/lineup";

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
 * Photos on the hero floor row only when every machine has an asset
 * and trimmed aspect stays within 8% of catalog Ш/В (front-view check).
 */
export function canUseLineupPhotos(lineup: readonly LineupModel[]): boolean {
  if (lineup.length === 0) return false;
  const manifest = getImagesManifest();
  if (!manifest.cloudName) return false;

  return lineup.every((machine) => {
    const entry = manifest.images[machine.slug];
    if (!entry || entry.width <= 1 || entry.height <= 1) return false;
    const tw = entry.trimWidth ?? entry.width;
    const th = entry.trimHeight ?? entry.height;
    return (
      photoAspectDeviationPct(
        tw,
        th,
        machine.dimensionsMm.w,
        machine.dimensionsMm.h,
      ) <= LINEUP_ASPECT_MAX_DEVIATION_PCT
    );
  });
}
