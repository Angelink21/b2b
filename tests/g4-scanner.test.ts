import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = [
  path.join(ROOT, "src", "app"),
  path.join(ROOT, "src", "components"),
];

const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const RGB_RE = /\brgba?\s*\(/i;
const CYRILLIC_RE = /[\u0400-\u04FF]/;

/** Files allowed to contain hex (tokens / theme boot / global-error fallback). */
const HEX_ALLOWLIST = new Set([
  path.join(ROOT, "src", "styles", "tokens.css"),
  path.join(ROOT, "src", "styles", "tokens.ts"),
  path.join(ROOT, "src", "components", "theme", "ThemeScript.tsx"),
  path.join(ROOT, "src", "app", "global-error.tsx"),
]);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx|ts|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("G4 scanner", () => {
  const files = SCAN_DIRS.flatMap((dir) => walk(dir));

  it("scans components and app trees", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("has no hex/rgb outside allowlisted token files", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (HEX_ALLOWLIST.has(file)) continue;
      // globals.css imports tokens; body rules use vars only — still scan
      if (file.endsWith(`${path.sep}globals.css`)) {
        const css = fs.readFileSync(file, "utf8");
        // Allow @import of tokens.css; forbid raw hex in the rest
        const withoutImport = css.replace(/@import[^;]+;/g, "");
        if (HEX_RE.test(withoutImport) || RGB_RE.test(withoutImport)) {
          offenders.push(path.relative(ROOT, file));
        }
        continue;
      }
      const text = fs.readFileSync(file, "utf8");
      if (HEX_RE.test(text) || RGB_RE.test(text)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has no Cyrillic in components/app (copy lives in messages/)", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith(`${path.sep}global-error.tsx`)) continue;
      const text = fs.readFileSync(file, "utf8");
      if (CYRILLIC_RE.test(text)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
