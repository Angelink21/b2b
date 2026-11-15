import fs from "node:fs";
import path from "node:path";

import {
  IMAGE_FALLBACK_ASPECT_RATIO,
  imagesManifestSchema,
  type ImagesManifest,
} from "./types";

let cached: ImagesManifest | null = null;

function readManifestFromDisk(): ImagesManifest {
  const filePath = path.join(
    process.cwd(),
    "src",
    "data",
    "images.generated.json",
  );
  const raw = fs.readFileSync(filePath, "utf8");
  return imagesManifestSchema.parse(JSON.parse(raw) as unknown);
}

export function getImagesManifest(): ImagesManifest {
  if (cached) return cached;
  cached = readManifestFromDisk();
  return cached;
}

/** Empty manifest used when the generated file is a stub / tests. */
export function emptyImagesManifest(
  partial?: Partial<ImagesManifest>,
): ImagesManifest {
  return imagesManifestSchema.parse({
    version: 1,
    generatedAt: new Date(0).toISOString(),
    cloudName: "",
    folder: "",
    fallbackAspectRatio: IMAGE_FALLBACK_ASPECT_RATIO,
    images: {},
    missingSlugs: [],
    ...partial,
  });
}

/** Test helper. */
export function __setImagesManifestForTests(value: ImagesManifest | null): void {
  cached = value;
}
