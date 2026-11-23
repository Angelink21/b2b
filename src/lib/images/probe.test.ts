import { afterEach, describe, expect, it } from "vitest";

import {
  __setProbeFetchForTests,
  cloudinaryDeliveryUrl,
  probeCloudinaryPublicId,
} from "./probe";

afterEach(() => {
  __setProbeFetchForTests(null);
});

describe("probeCloudinaryPublicId", () => {
  it("returns null on HEAD 404", async () => {
    __setProbeFetchForTests(async () => new Response(null, { status: 404 }));
    await expect(
      probeCloudinaryPublicId("demo", "ПРАЛЬНЯ_TO_GO"),
    ).resolves.toBeNull();
  });

  it("returns entry with dims on HEAD 200 + fl_getinfo", async () => {
    __setProbeFetchForTests(async (input, init) => {
      const url = String(input);
      if (init?.method === "HEAD") {
        return new Response(null, { status: 200 });
      }
      if (url.includes("e_trim")) {
        return Response.json({
          input: { width: 900, height: 600 },
        });
      }
      return Response.json({
        input: { width: 1080, height: 720 },
      });
    });
    const entry = await probeCloudinaryPublicId("demo", "ПРАЛЬНЯ_TO_GO");
    expect(entry).toEqual({
      publicId: "ПРАЛЬНЯ_TO_GO",
      width: 1080,
      height: 720,
      trimWidth: 900,
      trimHeight: 600,
    });
  });

  it("builds delivery URL with encoded public_id", () => {
    const url = cloudinaryDeliveryUrl("demo", "ПРАЛЬНЯ_TO_GO");
    expect(url.startsWith("https://res.cloudinary.com/demo/image/upload/")).toBe(
      true,
    );
    expect(url.endsWith(".png")).toBe(true);
    expect(url).toContain(encodeURIComponent("ПРАЛЬНЯ_TO_GO").replace(/%2F/gi, "/"));
  });
});
