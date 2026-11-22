import { describe, expect, it } from "vitest";

import {
  clampRectInViewport,
  nameFitsInMachineBox,
  pickCalloutSide,
  selectMachineLabelMode,
} from "./machine-label";

describe("selectMachineLabelMode", () => {
  it("uses full labels when the machine is large enough and the name fits", () => {
    expect(
      selectMachineLabelMode({
        widthPx: 120,
        heightPx: 80,
        nameFitsInside: true,
      }),
    ).toBe("full");
  });

  it("keeps name-only when the box is under 90×36 but the name still fits", () => {
    expect(
      selectMachineLabelMode({
        widthPx: 70,
        heightPx: 30,
        nameFitsInside: true,
      }),
    ).toBe("name");
  });

  it("switches to callout when the name does not fit inside", () => {
    expect(
      selectMachineLabelMode({
        widthPx: 40,
        heightPx: 20,
        nameFitsInside: false,
      }),
    ).toBe("callout");
    expect(
      selectMachineLabelMode({
        widthPx: 200,
        heightPx: 100,
        nameFitsInside: false,
      }),
    ).toBe("callout");
  });
});

describe("nameFitsInMachineBox", () => {
  it("rejects tiny boxes and accepts wide ones for short names", () => {
    expect(nameFitsInMachineBox("LAP-08", 20, 20)).toBe(false);
    expect(nameFitsInMachineBox("LAP-08", 120, 60)).toBe(true);
  });
});

describe("clampRectInViewport", () => {
  it("keeps badge inside the stage", () => {
    expect(
      clampRectInViewport(
        { left: -40, top: -10, width: 80, height: 24 },
        { width: 400, height: 300 },
      ),
    ).toEqual({ left: 2, top: 2, width: 80, height: 24 });
  });
});

describe("pickCalloutSide", () => {
  it("prefers right when there is room", () => {
    expect(
      pickCalloutSide(
        { left: 10, top: 10, width: 40, height: 40 },
        { width: 400, height: 300 },
        100,
        40,
      ),
    ).toBe("right");
  });

  it("falls back to bottom near the right edge", () => {
    expect(
      pickCalloutSide(
        { left: 320, top: 10, width: 40, height: 40 },
        { width: 400, height: 300 },
        100,
        40,
      ),
    ).toBe("bottom");
  });
});
