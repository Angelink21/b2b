import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "../..");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("catalog client payload", () => {
  it("catalog client islands do not import full generated catalog", () => {
    const files = [
      "components/catalog/CatalogExplorer.tsx",
      "components/catalog/CatalogTable.tsx",
      "components/catalog/CatalogScrollRestore.tsx",
      "components/catalog/CatalogReturnLink.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/catalog\.generated\.json/);
      expect(source).not.toMatch(/from ["']@\/lib\/catalog["']/);
      expect(source).not.toMatch(/getAll\s*\(/);
    }
  });

  it("model page is a server module that loads catalog on the server only", () => {
    const source = read(
      "app/[locale]/catalog/[category]/[slug]/page.tsx",
    );
    expect(source).not.toMatch(/^["']use client["']/m);
    expect(source).toMatch(/getBySlug/);
    expect(source).toMatch(/buildModelStaticParams/);
  });
});
