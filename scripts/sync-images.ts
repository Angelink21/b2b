/**
 * HEAD-probe Cloudinary delivery URLs for every catalog model.
 * No Admin API (no API key/secret). Writes src/data/images.generated.json
 * and docs/IMAGES_REPORT.md. Missing photos never fail the build.
 */
import fs from "node:fs";
import path from "node:path";

import { selectLineup } from "../src/lib/catalog/lineup";
import type { Product } from "../src/lib/catalog/schema";
import {
  encodeCloudinaryPath,
  imageKeyToPublicId,
} from "../src/lib/images/normalize";
import {
  IMAGE_FALLBACK_ASPECT_RATIO,
  imagesManifestSchema,
  type ModelImageEntry,
} from "../src/lib/images/types";

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const OUT_JSON = path.join(ROOT, "src/data/images.generated.json");
const OUT_REPORT = path.join(ROOT, "docs/IMAGES_REPORT.md");

const CONCURRENCY = 8;
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const ASPECT_WARN_PCT = 8;

type CatalogFile = {
  products: Array<
    Pick<Product, "slug" | "name" | "imageKey" | "category" | "dimensionsMm"> & {
      imageId?: string | null;
    }
  >;
};

function loadDotEnv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(path.join(ROOT, ".env.local"));

function deliveryUrl(cloud: string, publicId: string, format = "png"): string {
  return `https://res.cloudinary.com/${cloud}/image/upload/${encodeCloudinaryPath(publicId)}.${format}`;
}

function infoUrl(
  cloud: string,
  publicId: string,
  transforms: string,
  format = "png",
): string {
  return `https://res.cloudinary.com/${cloud}/image/upload/${transforms}/${encodeCloudinaryPath(publicId)}.${format}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

async function headOk(url: string): Promise<boolean> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { method: "HEAD" });
      if (res.status === 200) return true;
      if (res.status === 404 || res.status === 420) return false;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  if (lastErr) {
    console.warn(`[images:sync] HEAD failed for ${url}: ${String(lastErr)}`);
  }
  return false;
}

type InfoJson = {
  input?: { width?: number; height?: number };
  output?: { width?: number; height?: number };
};

async function fetchInfo(
  url: string,
): Promise<{ width: number; height: number } | null> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { method: "GET" });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        const data = (await res.json()) as InfoJson;
        const width = data.input?.width ?? data.output?.width;
        const height = data.input?.height ?? data.output?.height;
        if (
          typeof width === "number" &&
          typeof height === "number" &&
          width > 0 &&
          height > 0
        ) {
          return { width, height };
        }
        lastErr = new Error("missing dimensions in fl_getinfo");
      }
    } catch (err) {
      lastErr = err;
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  if (lastErr) {
    console.warn(`[images:sync] fl_getinfo failed for ${url}: ${String(lastErr)}`);
  }
  return null;
}

async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

function aspectDeviationPct(
  photoW: number,
  photoH: number,
  dimW: number,
  dimH: number,
): number {
  if (photoH <= 0 || dimH <= 0) return 0;
  const photoRatio = photoW / photoH;
  const dimRatio = dimW / dimH;
  return (Math.abs(photoRatio - dimRatio) / dimRatio) * 100;
}

function writeEmpty(cloudName: string, folder: string, reason: string): void {
  const manifest = imagesManifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    cloudName,
    folder,
    fallbackAspectRatio: IMAGE_FALLBACK_ASPECT_RATIO,
    images: {},
    missingSlugs: [],
  });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const report = [
    "# Images report",
    "",
    `Generated: ${manifest.generatedAt}`,
    "",
    reason,
    "",
    "Photos found: **0**",
    "Models without photos: _(catalog not probed)_",
    "",
    "## Notes",
    "",
    "- Sync uses public delivery HEAD requests (no Cloudinary Admin API).",
    `- Fallback aspect ratio constant: \`${IMAGE_FALLBACK_ASPECT_RATIO}\` with \`object-fit: contain\` when pixel size is unknown.`,
    "- Extra Cloudinary assets without a model cannot be listed without Admin API.",
    "",
  ].join("\n");
  fs.writeFileSync(OUT_REPORT, report, "utf8");
  console.log(`[images:sync] ${reason}`);
}

async function main(): Promise<void> {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? "").trim();
  const folder = (process.env.CLOUDINARY_FOLDER ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!cloudName) {
    writeEmpty(
      "",
      folder,
      "CLOUDINARY_CLOUD_NAME is not set — site keeps silhouettes.",
    );
    return;
  }

  if (!fs.existsSync(CATALOG_PATH)) {
    writeEmpty(
      cloudName,
      folder,
      "catalog.generated.json missing — run pnpm catalog:build first.",
    );
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as CatalogFile;
  const products = catalog.products;
  console.log(
    `[images:sync] Probing ${products.length} models (concurrency ${CONCURRENCY})…`,
  );

  type ProbeResult = {
    slug: string;
    name: string;
    entry: ModelImageEntry | null;
    ambiguous: boolean;
  };

  const ambiguous: string[] = [];

  const results = await mapPool(products, CONCURRENCY, async (product) => {
    const sourceKey = product.imageId?.trim() || product.imageKey;
    const publicId = imageKeyToPublicId(sourceKey, folder);
    const url = deliveryUrl(cloudName, publicId, "png");
    const exists = await headOk(url);
    if (!exists) {
      return {
        slug: product.slug,
        name: product.name,
        entry: null,
        ambiguous: false,
      } satisfies ProbeResult;
    }

    const dims =
      (await fetchInfo(infoUrl(cloudName, publicId, "fl_getinfo", "png"))) ??
      null;
    const trim =
      (await fetchInfo(
        infoUrl(cloudName, publicId, "e_trim,fl_getinfo", "png"),
      )) ?? null;

    // fl_getinfo works; if it fails, still record presence with 1×1 placeholder
    // so UI can use fixed aspect + object-fit contain.
    const entry: ModelImageEntry = {
      publicId,
      width: dims?.width ?? 1,
      height: dims?.height ?? 1,
      ...(trim
        ? { trimWidth: trim.width, trimHeight: trim.height }
        : {}),
    };

    return {
      slug: product.slug,
      name: product.name,
      entry,
      ambiguous: false,
    } satisfies ProbeResult;
  });

  const images: Record<string, ModelImageEntry> = {};
  const missing: Array<{ slug: string; name: string }> = [];

  for (const r of results) {
    if (r.ambiguous) {
      ambiguous.push(r.slug);
      continue;
    }
    if (r.entry) {
      images[r.slug] = r.entry;
    } else {
      missing.push({ slug: r.slug, name: r.name });
    }
  }

  if (ambiguous.length > 0) {
    console.error(
      `[images:sync] FAIL: ambiguous matches for: ${ambiguous.join(", ")}`,
    );
    process.exit(1);
  }

  const manifest = imagesManifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    cloudName,
    folder,
    fallbackAspectRatio: IMAGE_FALLBACK_ASPECT_RATIO,
    images,
    missingSlugs: missing.map((m) => m.slug),
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  // Lineup photo rule + aspect warnings
  const fullProducts = catalog.products as Product[];
  const lineup = selectLineup(fullProducts);
  const lineupAllHavePhoto =
    lineup.length > 0 && lineup.every((m) => Boolean(images[m.slug]));

  const aspectWarnings: string[] = [];
  let lineupAspectOk = lineupAllHavePhoto;
  for (const product of products) {
    const entry = images[product.slug];
    if (!entry) continue;
    const tw = entry.trimWidth ?? entry.width;
    const th = entry.trimHeight ?? entry.height;
    if (entry.width <= 1 || entry.height <= 1) continue;
    const pct = aspectDeviationPct(
      tw,
      th,
      product.dimensionsMm.w,
      product.dimensionsMm.h,
    );
    if (pct > ASPECT_WARN_PCT) {
      aspectWarnings.push(
        `- ${product.name} (\`${product.slug}\`): trimmed photo ${tw}×${th} vs dims ${product.dimensionsMm.w}×${product.dimensionsMm.h} mm — deviation ${pct.toFixed(1)}% (likely not a straight front view)`,
      );
      if (lineup.some((m) => m.slug === product.slug)) {
        lineupAspectOk = false;
      }
    }
  }

  const foundCount = Object.keys(images).length;
  const reportLines = [
    "# Images report",
    "",
    `Generated: ${manifest.generatedAt}`,
    "",
    `Photos found: **${foundCount}** / ${products.length}`,
    `Models without photos: **${missing.length}**`,
    "",
    "## Naming scheme (chosen from step-0 probe)",
    "",
    "- Delivery: `https://res.cloudinary.com/<cloud>/image/upload/<publicId>.png`",
    "- `publicId` = imageKey without extension, spaces → `_`; optional `CLOUDINARY_FOLDER/` prefix when set",
    "- Version segment (`v…`) not required; no transformations in the existence check",
    "- `/` in model names is already `_` inside CSV imageKey",
    "",
    "## Dimensions",
    "",
    "- Width/height from Cloudinary `fl_getinfo` (and `e_trim,fl_getinfo` for lineup trim box)",
    `- If info is unavailable, entry keeps placeholder 1×1 and UI uses fallback aspect \`${IMAGE_FALLBACK_ASPECT_RATIO}\` with \`object-fit: contain\``,
    "",
    "## Lineup (home)",
    "",
    lineupAllHavePhoto && lineupAspectOk
      ? `- All ${lineup.length} lineup machines have photos with trim AR within ${ASPECT_WARN_PCT}% of Ш/В → lineup may use \`e_trim\` photos in the shared floor box.`
      : `- Lineup stays on **silhouettes** (need photo for every machine and trim AR ≤ ${ASPECT_WARN_PCT}% vs catalog Ш/В; current Cloudinary crops are not front-view enough).`,
    "",
    "Lineup slugs (LA/LAP/LN front-loaders only):",
    ...lineup.map(
      (m) =>
        `- ${m.name} (\`${m.slug}\`): ${images[m.slug] ? "photo" : "missing"}`,
    ),
    "",
    "## Models without photos",
    "",
    ...(missing.length === 0
      ? ["_(none)_", ""]
      : [
          ...missing.map((m) => `- ${m.name} (\`${m.slug}\`)`),
          "",
        ]),
    "## Aspect-ratio warnings (>8% vs Ш/В)",
    "",
    ...(aspectWarnings.length === 0
      ? ["_(none)_", ""]
      : [...aspectWarnings, ""]),
    "## Ambiguous matches",
    "",
    "_(none — sync uses deterministic public_id from imageKey; Admin API listing not used)_",
    "",
    "## Extra Cloudinary files without a model",
    "",
    "_(not available without Admin API)_",
    "",
    "## Notes",
    "",
    "- No API key/secret: existence via HEAD only.",
    "- Env values are not written into this report.",
    "",
  ];

  fs.writeFileSync(OUT_REPORT, reportLines.join("\n"), "utf8");

  console.log(`[images:sync] Found ${foundCount}/${products.length}`);
  console.log(`[images:sync] Missing ${missing.length}`);
  console.log(`[images:sync] wrote ${path.relative(ROOT, OUT_JSON)}`);
  console.log(`[images:sync] wrote ${path.relative(ROOT, OUT_REPORT)}`);
}

main().catch((err: unknown) => {
  console.error(`[images:sync] FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
