/**
 * Honest silhouette geometry from catalog millimeters (DESIGN.md).
 * Front view uses width (w) and height (h); depth is unused for the outline.
 */

export type SilhouetteDims = {
  w: number;
  h: number;
};

/**
 * Scale so the larger of width/height fits `targetMaxPx` (prototype: 190 or 300).
 */
export function silhouetteScale(
  dims: SilhouetteDims,
  targetMaxPx: number,
): number {
  const maxMm = Math.max(dims.w, dims.h);
  if (maxMm <= 0 || targetMaxPx <= 0) {
    throw new Error("silhouetteScale requires positive dims and target");
  }
  return targetMaxPx / maxMm;
}

export function silhouettePixelSize(
  dims: SilhouetteDims,
  scale: number,
): { width: number; height: number } {
  return {
    width: dims.w * scale,
    height: dims.h * scale,
  };
}

/** Inner circle radius relative to the smaller side (prototype ~0.27). */
export function portholeRadius(widthPx: number, heightPx: number): number {
  return Math.min(widthPx, heightPx) * 0.27;
}
