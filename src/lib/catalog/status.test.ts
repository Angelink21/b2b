import { describe, expect, it } from "vitest";

import {
  authorizeCatalogStatus,
  buildCatalogStatusPayload,
  runtimeStatusFromMeta,
} from "./status";
import type { CatalogRuntimeResult } from "./runtime";

describe("authorizeCatalogStatus", () => {
  it("returns 404 when the secret is unset", () => {
    expect(authorizeCatalogStatus("Bearer anything", null)).toEqual({
      ok: false,
      status: 404,
    });
    expect(authorizeCatalogStatus(null, null)).toEqual({
      ok: false,
      status: 404,
    });
  });

  it("returns 401 for missing or wrong bearer when secret is set", () => {
    expect(authorizeCatalogStatus(null, "secret")).toEqual({
      ok: false,
      status: 401,
    });
    expect(authorizeCatalogStatus("Bearer wrong", "secret")).toEqual({
      ok: false,
      status: 401,
    });
    expect(authorizeCatalogStatus("Token secret", "secret")).toEqual({
      ok: false,
      status: 401,
    });
  });

  it("accepts a matching Bearer token", () => {
    expect(authorizeCatalogStatus("Bearer secret", "secret")).toEqual({
      ok: true,
    });
    expect(authorizeCatalogStatus("bearer secret", "secret")).toEqual({
      ok: true,
    });
  });
});

describe("buildCatalogStatusPayload", () => {
  it("maps getCatalog meta into runtime status without a sheet URL", () => {
    const catalog: CatalogRuntimeResult = {
      data: { products: [], series: [], index: [] },
      meta: {
        fetchedAt: "2026-11-15T12:00:00.000Z",
        source: "snapshot",
        modelCount: 303,
        errors: ["CSV source returned HTML"],
      },
    };

    const payload = buildCatalogStatusPayload(
      { builtAt: "2026-11-01T00:00:00.000Z", modelCount: 303, source: "remote" },
      catalog,
    );

    expect(payload.build).toEqual({
      builtAt: "2026-11-01T00:00:00.000Z",
      modelCount: 303,
      source: "remote",
    });
    expect(payload.runtime).toEqual(
      runtimeStatusFromMeta(catalog.meta),
    );
    expect(JSON.stringify(payload)).not.toMatch(/google|spreadsheet|http/i);
  });
});
