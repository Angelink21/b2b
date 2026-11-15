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

/** Standard Tailwind steps that land on 4 · 8 · 16 · 24 · 48 · 96. */
const ALLOWED_SPACING_STEPS = new Set(["1", "2", "4", "6", "12", "24"]);

const SPACING_UTILITIES = [
  "scroll-px",
  "scroll-py",
  "scroll-pt",
  "scroll-pr",
  "scroll-pb",
  "scroll-pl",
  "scroll-ps",
  "scroll-pe",
  "scroll-p",
  "scroll-mx",
  "scroll-my",
  "scroll-mt",
  "scroll-mr",
  "scroll-mb",
  "scroll-ml",
  "scroll-ms",
  "scroll-me",
  "scroll-m",
  "translate-x",
  "translate-y",
  "gap-x",
  "gap-y",
  "space-x",
  "space-y",
  "inset-x",
  "inset-y",
  "inset-s",
  "inset-e",
  "min-w",
  "max-w",
  "min-h",
  "max-h",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "ps",
  "pe",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "ms",
  "me",
  "gap",
  "inset",
  "size",
  "basis",
  "top",
  "right",
  "bottom",
  "left",
  "start",
  "end",
  "p",
  "m",
  "w",
  "h",
];

const SPACING_CLASS_RE = new RegExp(
  `(?:^|[\\s"'\\\`])(?:[\\w[\\].%-]+:)*!?-?(?:${SPACING_UTILITIES.join("|")})-(\\d+(?:\\.\\d+)?)(?![\\w./-])`,
  "g",
);

/** Numeric spacing-scale steps outside 1, 2, 4, 6, 12, 24. */
function offScaleSpacingClasses(text: string): string[] {
  const found: string[] = [];
  const re = new RegExp(SPACING_CLASS_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const step = match[1];
    if (step && !ALLOWED_SPACING_STEPS.has(step)) {
      found.push(match[0].trim());
    }
  }
  return found;
}

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

  it("allows only spacing steps 1, 2, 4, 6, 12, 24", () => {
    expect(offScaleSpacingClasses("mt-6 py-12 py-24 p-1 gap-2 w-4 h-12")).toEqual(
      [],
    );
    expect(
      offScaleSpacingClasses(
        'className="max-w-3xl w-full w-1/2 gap-gutter p-18-100-m-e"',
      ),
    ).toEqual([]);
    expect(offScaleSpacingClasses("mt-8 gap-5 w-10 p-3").length).toBeGreaterThan(
      0,
    );

    const offenders: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      const lines = text.split("\n");
      lines.forEach((line, index) => {
        for (const hit of offScaleSpacingClasses(line)) {
          offenders.push(`${path.relative(ROOT, file)}:${index + 1} ${hit}`);
        }
      });
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
