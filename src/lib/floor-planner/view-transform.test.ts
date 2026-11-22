import { describe, expect, it } from "vitest";

import {
  clampPan,
  clampZoom,
  clientPointToMm,
  fitScalePxPerMm,
  fitView,
  formatZoomPercent,
  labelFontSizeMm,
  screenDeltaToMm,
  stepZoom,
  viewportHeightPx,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./view-transform";

describe("clampZoom / stepZoom", () => {
  it("clamps to 50%–300% in 25% steps", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(4)).toBe(ZOOM_MAX);
    expect(clampZoom(1.12)).toBe(1);
    expect(clampZoom(1.2)).toBe(1.25);
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
  });

  it("formats percent label", () => {
    expect(formatZoomPercent(1)).toBe("100%");
    expect(formatZoomPercent(2)).toBe("200%");
    expect(formatZoomPercent(0.5)).toBe("50%");
  });
});

describe("screenDeltaToMm", () => {
  const roomW = 6000;
  const roomL = 4000;
  const viewportW = 600;
  const viewportH = 400;
  const pxPerMm = fitScalePxPerMm(viewportW, viewportH, roomW, roomL);

  it.each([
    { zoom: 0.5, dxPx: 100, expectedDxMm: 100 / (pxPerMm * 0.5) },
    { zoom: 1, dxPx: 100, expectedDxMm: 100 / pxPerMm },
    { zoom: 2, dxPx: 100, expectedDxMm: 100 / (pxPerMm * 2) },
    { zoom: 3, dxPx: 100, expectedDxMm: 100 / (pxPerMm * 3) },
  ])(
    "at $zoom×, $dxPx px screen delta maps to mm",
    ({ zoom, dxPx, expectedDxMm }) => {
      const { dxMm, dyMm } = screenDeltaToMm(dxPx, 0, zoom, pxPerMm);
      expect(dxMm).toBeCloseTo(expectedDxMm, 6);
      expect(dyMm).toBe(0);
    },
  );

  it("at 200%, 100px mouse move is 50px of unzoomed content", () => {
    const { dxMm } = screenDeltaToMm(100, 0, 2, pxPerMm);
    // Unzoomed px = 100 / 2 = 50; mm = 50 / pxPerMm
    expect(dxMm).toBeCloseTo(50 / pxPerMm, 6);
  });
});

describe("clientPointToMm", () => {
  const roomW = 6000;
  const roomL = 4000;
  const viewport = { left: 0, top: 0, width: 600, height: 400 };

  it.each([0.5, 1, 2, 3])(
    "round-trips viewport center to room center at zoom %s",
    (zoom) => {
      const { xMm, yMm } = clientPointToMm(
        300,
        200,
        viewport,
        roomW,
        roomL,
        zoom,
        0,
        0,
      );
      expect(xMm).toBeCloseTo(roomW / 2, 5);
      expect(yMm).toBeCloseTo(roomL / 2, 5);
    },
  );

  it("maps a screen delta at 200% like screenDeltaToMm", () => {
    const pxPerMm = fitScalePxPerMm(
      viewport.width,
      viewport.height,
      roomW,
      roomL,
    );
    const a = clientPointToMm(300, 200, viewport, roomW, roomL, 2, 0, 0);
    const b = clientPointToMm(400, 200, viewport, roomW, roomL, 2, 0, 0);
    const { dxMm } = screenDeltaToMm(100, 0, 2, pxPerMm);
    expect(b.xMm - a.xMm).toBeCloseTo(dxMm, 5);
  });
});

describe("clampPan / fitView / viewportHeightPx", () => {
  it("zeros pan at zoom ≤ 100%", () => {
    expect(clampPan(40, -20, 1, 600, 400)).toEqual({ panX: 0, panY: 0 });
    expect(fitView()).toEqual({ zoom: ZOOM_DEFAULT, panX: 0, panY: 0 });
  });

  it("limits pan so content stays within pad of the viewport", () => {
    const zoom = 2;
    const w = 600;
    const h = 400;
    const pad = 24;
    const maxX = (w * (zoom - 1)) / 2 + pad;
    const clamped = clampPan(10_000, -10_000, zoom, w, h, pad);
    expect(clamped.panX).toBe(maxX);
    expect(clamped.panY).toBe(-((h * (zoom - 1)) / 2 + pad));
  });

  it("caps viewport height at 70vh", () => {
    // 600px wide, room 6×4 → aspect height 400; 70vh of 1000 = 700 → 400
    expect(viewportHeightPx(600, 6, 4, 1000)).toBe(400);
    // Tall room 6×20 → aspect 2000; 70vh of 1000 = 700 → 700
    expect(viewportHeightPx(600, 6, 20, 1000)).toBe(700);
  });
});

describe("labelFontSizeMm", () => {
  it("raises font size when zoom would shrink labels below 12px", () => {
    const pxPerMm = 0.1; // 10 px per 100 mm
    const preferred = 60;
    // At zoom 0.5: screen = 60 * 0.1 * 0.5 = 3px → floor to 12/0.05 = 240
    expect(labelFontSizeMm(preferred, pxPerMm, 0.5)).toBeCloseTo(240, 5);
    // At zoom 2: screen = 60 * 0.1 * 2 = 12px → keep preferred
    expect(labelFontSizeMm(preferred, pxPerMm, 2)).toBe(60);
  });
});
