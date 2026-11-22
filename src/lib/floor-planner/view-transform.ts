/** Zoom / pan math for the floor-planner viewport (pure, unit-tested). */

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;
export const ZOOM_DEFAULT = 1;
/** How far room edges may leave the viewport, in CSS pixels. */
export const VIEW_PAD_PX = 24;
/** Arrow-key pan step when no machine is selected. */
export const PAN_STEP_PX = 24;
export const MIN_LABEL_SCREEN_PX = 12;

export type ViewTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

export type ViewportRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Clamp to [50%, 300%] without snapping (pinch / continuous). */
export function clampZoomRange(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** Snap to 25% steps, then clamp (buttons, keys, Ctrl+wheel). */
export function clampZoom(zoom: number): number {
  const stepped = Math.round(zoom / ZOOM_STEP) * ZOOM_STEP;
  const clamped = clampZoomRange(stepped);
  // Avoid -0 and float noise around steps.
  return Math.round(clamped * 100) / 100;
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
  return clampZoom(zoom + direction * ZOOM_STEP);
}

export function formatZoomPercent(zoom: number): string {
  return `${Math.round(clampZoomRange(zoom) * 100)}%`;
}

/**
 * CSS px per mm when zoom = 1 (room fitted into the viewport with "meet").
 * Reserves `padPx` on each side so the room is not flush against the stage edge.
 */
export function fitScalePxPerMm(
  viewportW: number,
  viewportH: number,
  roomWidthMm: number,
  roomLengthMm: number,
  padPx: number = VIEW_PAD_PX,
): number {
  const innerW = viewportW - 2 * padPx;
  const innerH = viewportH - 2 * padPx;
  if (
    innerW <= 0 ||
    innerH <= 0 ||
    roomWidthMm <= 0 ||
    roomLengthMm <= 0
  ) {
    return 1;
  }
  return Math.min(innerW / roomWidthMm, innerH / roomLengthMm);
}

/**
 * Screen delta → millimetres at the current zoom.
 * Example: zoom 200%, 100px mouse move → 50px of unzoomed content → mm via fit scale.
 */
export function screenDeltaToMm(
  dxPx: number,
  dyPx: number,
  zoom: number,
  pxPerMmAtFit: number,
): { dxMm: number; dyMm: number } {
  const safeZoom = zoom > 0 ? zoom : 1;
  const safeScale = pxPerMmAtFit > 0 ? pxPerMmAtFit : 1;
  const pxPerMm = safeScale * safeZoom;
  return {
    dxMm: dxPx / pxPerMm,
    dyMm: dyPx / pxPerMm,
  };
}

/**
 * Inverse of the viewport transform:
 * screen = center + pan + (unzoomed - center) * zoom
 * where unzoomed maps linearly from room mm via fit scale + letterbox.
 */
export function clientPointToMm(
  clientX: number,
  clientY: number,
  viewport: ViewportRect,
  roomWidthMm: number,
  roomLengthMm: number,
  zoom: number,
  panX: number,
  panY: number,
): { xMm: number; yMm: number } {
  const pxPerMm = fitScalePxPerMm(
    viewport.width,
    viewport.height,
    roomWidthMm,
    roomLengthMm,
    VIEW_PAD_PX,
  );
  const contentW = roomWidthMm * pxPerMm;
  const contentH = roomLengthMm * pxPerMm;
  const originX = viewport.left + (viewport.width - contentW) / 2;
  const originY = viewport.top + (viewport.height - contentH) / 2;
  const cx = viewport.left + viewport.width / 2;
  const cy = viewport.top + viewport.height / 2;
  const safeZoom = zoom > 0 ? zoom : 1;
  const unzoomedX = cx + (clientX - cx - panX) / safeZoom;
  const unzoomedY = cy + (clientY - cy - panY) / safeZoom;
  return {
    xMm: (unzoomedX - originX) / pxPerMm,
    yMm: (unzoomedY - originY) / pxPerMm,
  };
}

export function clampPan(
  panX: number,
  panY: number,
  zoom: number,
  viewportW: number,
  viewportH: number,
  padPx: number = VIEW_PAD_PX,
): { panX: number; panY: number } {
  if (zoom <= 1 || viewportW <= 0 || viewportH <= 0) {
    return { panX: 0, panY: 0 };
  }
  const maxX = (viewportW * (zoom - 1)) / 2 + padPx;
  const maxY = (viewportH * (zoom - 1)) / 2 + padPx;
  return {
    panX: Math.min(maxX, Math.max(-maxX, panX)),
    panY: Math.min(maxY, Math.max(-maxY, panY)),
  };
}

/** Zoom toward viewport center; re-clamp pan for the new zoom. */
export function zoomAtCenter(
  current: ViewTransform,
  nextZoom: number,
  viewportW: number,
  viewportH: number,
): ViewTransform {
  const zoom = clampZoomRange(nextZoom);
  if (zoom <= 1) {
    return { zoom, panX: 0, panY: 0 };
  }
  const pan = clampPan(current.panX, current.panY, zoom, viewportW, viewportH);
  return { zoom, ...pan };
}

export function fitView(): ViewTransform {
  return { zoom: ZOOM_DEFAULT, panX: 0, panY: 0 };
}

/** Viewport height: min(width × length/width, 70vh). */
export function viewportHeightPx(
  widthPx: number,
  roomWidthM: number,
  roomLengthM: number,
  vhPx: number,
): number {
  if (widthPx <= 0 || roomWidthM <= 0) return 0;
  const fromAspect = widthPx * (roomLengthM / roomWidthM);
  return Math.min(fromAspect, vhPx * 0.7);
}

/**
 * Label size in SVG user units (mm) so on-screen size stays ≥ minScreenPx.
 * `preferredMm` is the design size before the floor.
 */
export function labelFontSizeMm(
  preferredMm: number,
  pxPerMmAtFit: number,
  zoom: number,
  minScreenPx: number = MIN_LABEL_SCREEN_PX,
): number {
  const safeZoom = zoom > 0 ? zoom : 1;
  const safeScale = pxPerMmAtFit > 0 ? pxPerMmAtFit : 1;
  const minMm = minScreenPx / (safeScale * safeZoom);
  return Math.max(preferredMm, minMm);
}
