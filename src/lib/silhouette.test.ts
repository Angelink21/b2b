import { describe, expect, it } from "vitest";

import {
  portholeRadius,
  silhouettePixelSize,
  silhouetteScale,
} from "./silhouette";
import { computeSilhouetteLayout } from "@/components/ui/Silhouette";

describe("silhouetteScale", () => {
  it("fits the larger mm side into targetMaxPx (prototype lineup 190)", () => {
    // 686×1019 → scale from height
    expect(silhouetteScale({ w: 686, h: 1019 }, 190)).toBeCloseTo(
      190 / 1019,
      6,
    );
  });

  it("fits width when width is larger", () => {
    expect(silhouetteScale({ w: 2000, h: 800 }, 300)).toBeCloseTo(300 / 2000, 6);
  });

  it("pixel size multiplies mm by scale", () => {
    const scale = silhouetteScale({ w: 686, h: 1019 }, 190);
    const size = silhouettePixelSize({ w: 686, h: 1019 }, scale);
    expect(size.height).toBeCloseTo(190, 5);
    expect(size.width).toBeCloseTo(686 * scale, 5);
  });

  it("porthole radius is 27% of the smaller side", () => {
    expect(portholeRadius(100, 200)).toBeCloseTo(27, 5);
  });

  it("computeSilhouetteLayout matches scale math", () => {
    const layout = computeSilhouetteLayout(
      { w: 686, h: 1019 },
      { targetMaxPx: 300 },
    );
    expect(layout.scale).toBeCloseTo(300 / 1019, 6);
    expect(layout.height).toBeCloseTo(300, 5);
  });
});
