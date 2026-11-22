import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { routing } from "@/i18n/routing";

import { getSnapshotAll } from "./index";
import { buildModelStaticParams } from "./static-params";

const ROOT = path.join(__dirname, "../../..");

function readApp(rel: string): string {
  return fs.readFileSync(path.join(ROOT, "src", "app", rel), "utf8");
}

describe("buildModelStaticParams", () => {
  it("covers every snapshot model for each locale", () => {
    const params = buildModelStaticParams();
    const products = getSnapshotAll();
    expect(params).toHaveLength(products.length * routing.locales.length);
    expect(params.every((p) => routing.locales.includes(p.locale as "uk" | "en"))).toBe(
      true,
    );
    expect(new Set(params.map((p) => p.slug)).size).toBe(products.length);
  });
});

describe("generateStaticParams source contract", () => {
  it("model and datasheet pages prerender from the snapshot helper only", () => {
    const model = readApp("[locale]/catalog/[category]/[slug]/page.tsx");
    const datasheet = readApp(
      "[locale]/catalog/[category]/[slug]/datasheet/page.tsx",
    );

    for (const source of [model, datasheet]) {
      expect(source).toMatch(/buildModelStaticParams/);
      expect(source).toMatch(/generateStaticParams/);
      expect(source).toMatch(/from ["']@\/lib\/catalog\/static-params["']/);
      // Runtime queries are for the page body; static params must not call them.
      expect(source).not.toMatch(
        /generateStaticParams[\s\S]*?\{[\s\S]*?\bgetAll\s*\(/,
      );
      expect(source).not.toMatch(
        /\bexport const (dynamic|revalidate|fetchCache)\b/,
      );
      expect(source).not.toMatch(/\bdynamicParams\s*=\s*false\b/);
    }

    // Page body still uses runtime lookups + notFound for removed slugs.
    expect(model).toMatch(/await getBySlug/);
    expect(model).toMatch(/notFound\s*\(/);
    expect(datasheet).toMatch(/await getBySlug/);
    expect(datasheet).toMatch(/notFound\s*\(/);
  });
});

describe("build route table (prerender-manifest)", () => {
  const manifestPath = path.join(ROOT, ".next", "prerender-manifest.json");

  it("keeps marketing and catalog pages static / partial-static when a build exists", () => {
    if (!fs.existsSync(manifestPath)) {
      // `pnpm test` runs before `pnpm build` in verify; skip on a clean tree.
      expect(fs.existsSync(manifestPath)).toBe(false);
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      routes: Record<
        string,
        { compute?: string; renderingMode?: string }
      >;
    };

    const required = [
      "/uk",
      "/en",
      "/uk/catalog",
      "/en/catalog",
      "/uk/catalog/washers",
      "/uk/compare",
      "/en/compare",
      "/uk/quote",
    ];

    // Cache Components: fully static shell = "static"; pages that resume
    // with searchParams (compare/quote/catalog filters) = "resuming".
    const okCompute = ["static", "resuming"];

    for (const route of required) {
      const entry = manifest.routes[route];
      expect(entry, `missing prerender entry for ${route}`).toBeDefined();
      if (!entry) continue;
      expect(okCompute).toContain(entry.compute);
      expect(["STATIC", "PARTIALLY_STATIC"]).toContain(entry.renderingMode);
    }

    const modelRoute = Object.keys(manifest.routes).find(
      (r) =>
        r.startsWith("/uk/catalog/washers/") &&
        !r.includes("opengraph") &&
        !r.includes("datasheet"),
    );
    expect(modelRoute).toBeTruthy();
    expect(okCompute).toContain(manifest.routes[modelRoute!]?.compute);
  });
});
