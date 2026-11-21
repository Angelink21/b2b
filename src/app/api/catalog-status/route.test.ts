import { afterEach, describe, expect, it } from "vitest";

import { getEnv, resetEnvCache } from "@/env";
import { getSnapshotAll } from "@/lib/catalog/index";

import { GET } from "./route";

const SNAPSHOT_COUNT = getSnapshotAll().length;

afterEach(() => {
  delete process.env.CATALOG_STATUS_SECRET;
  delete process.env.CATALOG_CSV_URL;
  resetEnvCache();
});

describe("GET /api/catalog-status", () => {
  it("returns 404 when CATALOG_STATUS_SECRET is unset", async () => {
    delete process.env.CATALOG_STATUS_SECRET;
    resetEnvCache();
    expect(getEnv().catalogStatusSecret).toBeNull();

    const res = await GET(new Request("http://localhost/api/catalog-status"));
    expect(res.status).toBe(404);
  });

  it("returns 401 for a wrong bearer", async () => {
    process.env.CATALOG_STATUS_SECRET = "status-secret";
    resetEnvCache();

    const res = await GET(
      new Request("http://localhost/api/catalog-status", {
        headers: { Authorization: "Bearer nope" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns build + runtime meta from getCatalog without a sheet URL", async () => {
    process.env.CATALOG_STATUS_SECRET = "status-secret";
    delete process.env.CATALOG_CSV_URL;
    resetEnvCache();

    const res = await GET(
      new Request("http://localhost/api/catalog-status", {
        headers: { Authorization: "Bearer status-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      build: { modelCount: number; builtAt: string; source: string };
      runtime: {
        lastFetchAt: string;
        runtimeSource: string;
        runtimeModelCount: number;
        lastErrors: string[];
      };
    };

    expect(body.build.modelCount).toBe(SNAPSHOT_COUNT);
    expect(body.build.builtAt).toMatch(/^\d{4}-/);
    expect(body.runtime.runtimeSource).toBe("snapshot");
    expect(body.runtime.runtimeModelCount).toBe(SNAPSHOT_COUNT);
    expect(body.runtime.lastFetchAt).toMatch(/^\d{4}-/);
    expect(Array.isArray(body.runtime.lastErrors)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/docs\.google|spreadsheets/i);
  });
});
