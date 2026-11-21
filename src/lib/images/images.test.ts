import { afterEach, describe, expect, it } from "vitest";

import { cloudinaryLoader } from "./cloudinary-loader";
import { matchImageCandidate } from "./match";
import { __setImagesManifestForTests, emptyImagesManifest } from "./manifest";
import {
  imageKeyToPublicId,
  normalizeImageKey,
  stripCloudinaryUniqueTail,
} from "./normalize";
import { getModelImage } from "../images";
import {
  canUseLineupPhotos,
  photoAspectDeviationPct,
} from "./lineup-photos";

afterEach(() => {
  __setImagesManifestForTests(null);
});

describe("normalizeImageKey", () => {
  it("treats spaces, underscores, and hyphens as equal", () => {
    expect(normalizeImageKey("LA-60C TP2 HW.png")).toBe(
      normalizeImageKey("LA-60C_TP2_HW"),
    );
    expect(normalizeImageKey("LAP-08 TP2 E V.png")).toBe(
      normalizeImageKey("lap-08_tp2_e_v"),
    );
  });

  it("is case-insensitive and trims", () => {
    expect(normalizeImageKey("  P-18_100 M E.PNG ")).toBe(
      normalizeImageKey("p-18_100 m e"),
    );
  });
});

describe("stripCloudinaryUniqueTail", () => {
  it("removes _xxxxxx unique suffix from last segment", () => {
    expect(stripCloudinaryUniqueTail("fagor/models/LA-11_TP2_E_ab12cd")).toBe(
      "fagor/models/LA-11_TP2_E",
    );
  });

  it("keeps ids without a 6-char tail", () => {
    expect(stripCloudinaryUniqueTail("LA-60C_TP2_HW")).toBe("LA-60C_TP2_HW");
  });
});

describe("imageKeyToPublicId", () => {
  it("replaces spaces with underscores and strips extension", () => {
    expect(imageKeyToPublicId("LA-60C TP2 HW.png")).toBe("LA-60C_TP2_HW");
  });

  it("prefixes folder when set", () => {
    expect(imageKeyToPublicId("LAP-08 TP2 E.png", "fagor/models")).toBe(
      "fagor/models/LAP-08_TP2_E",
    );
  });
});

describe("matchImageCandidate", () => {
  const pool = [
    { publicId: "LA-60C_TP2_HW", width: 100, height: 100 },
    { publicId: "LAP-08_TP2_E_V", width: 100, height: 100 },
    { publicId: "models/LA-11_TP2_E_ab12cd", width: 80, height: 90 },
  ];

  it("matches by normalized imageKey", () => {
    const result = matchImageCandidate(
      { imageKey: "LA-60C TP2 HW.png" },
      pool,
    );
    expect(result.status).toBe("exact");
    if (result.status === "exact") {
      expect(result.candidate.publicId).toBe("LA-60C_TP2_HW");
    }
  });

  it("prefers imageId when provided", () => {
    const result = matchImageCandidate(
      { imageKey: "ignored.png", imageId: "LAP-08 TP2 E V" },
      pool,
    );
    expect(result.status).toBe("exact");
    if (result.status === "exact") {
      expect(result.candidate.publicId).toBe("LAP-08_TP2_E_V");
    }
  });

  it("strips unique tail only when needed", () => {
    const result = matchImageCandidate(
      { imageKey: "LA-11 TP2 E.png" },
      pool,
    );
    expect(result.status).toBe("exact");
    if (result.status === "exact") {
      expect(result.candidate.publicId).toBe("models/LA-11_TP2_E_ab12cd");
    }
  });

  it("reports ambiguous duplicates", () => {
    const result = matchImageCandidate(
      { imageKey: "X.png" },
      [
        { publicId: "X", width: 1, height: 1 },
        { publicId: "x", width: 2, height: 2 },
      ],
    );
    expect(result.status).toBe("ambiguous");
  });
});

describe("cloudinaryLoader", () => {
  it("encodes spaces in public_id path segments", () => {
    const url = cloudinaryLoader({
      src: "demo::folder/LA 60C_TP2",
      width: 400,
      quality: 75,
    });
    expect(url).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_400/folder/LA%2060C_TP2",
    );
  });
});

describe("lineup photo gate", () => {
  it("flags large aspect drift", () => {
    expect(photoAspectDeviationPct(1067, 800, 680, 1040)).toBeGreaterThan(8);
    expect(photoAspectDeviationPct(680, 1040, 680, 1040)).toBeLessThanOrEqual(8);
  });

  it("disallows lineup photos when fewer than six slots have assets", () => {
    __setImagesManifestForTests(
      emptyImagesManifest({
        cloudName: "demo",
        images: {
          "lap-08-tp2-e-v": {
            publicId: "LAP-08_TP2_E_V",
            width: 1067,
            height: 800,
          },
        },
      }),
    );
    const lineup = Array.from({ length: 8 }, (_, i) => ({
      slug: i === 0 ? "lap-08-tp2-e-v" : `no-photo-${i}`,
      name: "X",
      kgMax: 10 + i,
      dimensionsMm: { w: 680, d: 698, h: 1040 },
    }));
    expect(canUseLineupPhotos(lineup)).toBe(false);
  });

  it("allows lineup photos when every slot has a manifest entry", () => {
    __setImagesManifestForTests(
      emptyImagesManifest({
        cloudName: "demo",
        images: Object.fromEntries(
          Array.from({ length: 8 }, (_, i) => [
            `washer-${i}`,
            { publicId: `W${i}`, width: 400, height: 500 },
          ]),
        ),
      }),
    );
    const lineup = Array.from({ length: 8 }, (_, i) => ({
      slug: `washer-${i}`,
      name: "X",
      kgMax: 10 + i,
      dimensionsMm: { w: 680, d: 698, h: 1040 },
    }));
    expect(canUseLineupPhotos(lineup)).toBe(true);
  });
});

describe("getModelImage", () => {
  it("returns null when manifest has no cloud / no entry", () => {
    __setImagesManifestForTests(emptyImagesManifest());
    expect(
      getModelImage({
        slug: "lap-08-tp2-e",
        name: "LAP-08 TP2 E",
        category: "washers",
        imageKey: "LAP-08 TP2 E.png",
        image: null,
      }),
    ).toBeNull();
  });

  it("returns photo when slug is in the manifest", () => {
    __setImagesManifestForTests(
      emptyImagesManifest({
        cloudName: "demo",
        images: {
          "lap-08-tp2-e": {
            publicId: "LAP-08_TP2_E",
            width: 1080,
            height: 1080,
          },
        },
      }),
    );
    const photo = getModelImage({
      slug: "lap-08-tp2-e",
      name: "LAP-08 TP2 E",
      category: "washers",
      imageKey: "LAP-08 TP2 E.png",
      image: null,
    });
    expect(photo).not.toBeNull();
    expect(photo?.publicId).toBe("LAP-08_TP2_E");
    expect(photo?.loaderSrc).toBe("demo::LAP-08_TP2_E");
    expect(photo?.alt).toBe("LAP-08 TP2 E, washers");
    expect(photo?.url).toContain("res.cloudinary.com/demo/");
  });
});
