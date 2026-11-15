import type { Product } from "@/lib/catalog/schema";

import { buildCloudinaryUrl, toLoaderSrc } from "./images/cloudinary-loader";
import { getImagesManifest } from "./images/manifest";
import type { ModelImage } from "./images/types";

export type { ModelImage } from "./images/types";
export {
  IMAGE_FALLBACK_ASPECT_RATIO,
  type ImagesManifest,
  type ModelImageEntry,
} from "./images/types";
export {
  encodeCloudinaryPath,
  imageKeyToPublicId,
  normalizeImageKey,
  stripCloudinaryUniqueTail,
  stripImageExtension,
} from "./images/normalize";
export { matchImageCandidate } from "./images/match";
export {
  buildCloudinaryUrl,
  cloudinaryLoader,
  cloudinaryTrimLoader,
  toLoaderSrc,
} from "./images/cloudinary-loader";

/**
 * Resolve a model photo from the sync manifest.
 * Returns null when Cloudinary env was absent at sync time or the asset is missing.
 */
export function getModelImage(
  product: Pick<Product, "imageKey" | "name" | "category" | "image" | "slug">,
  opts?: { categoryLabel?: string },
): ModelImage | null {
  const manifest = getImagesManifest();
  if (!manifest.cloudName) return null;

  const entry = manifest.images[product.slug];
  if (!entry) return null;

  const categoryPart = opts?.categoryLabel ?? product.category;
  const alt = `${product.name}, ${categoryPart}`;
  const url = buildCloudinaryUrl(manifest.cloudName, entry.publicId, entry.width);

  const result: ModelImage = {
    url,
    width: entry.width,
    height: entry.height,
    alt,
    publicId: entry.publicId,
    loaderSrc: toLoaderSrc(manifest.cloudName, entry.publicId),
  };
  if (entry.trimWidth !== undefined) result.trimWidth = entry.trimWidth;
  if (entry.trimHeight !== undefined) result.trimHeight = entry.trimHeight;
  return result;
}

/** Loader `src` value for next/image (cloudName::publicId), or null. */
export function getModelImageLoaderSrc(
  product: Pick<Product, "slug">,
): string | null {
  const manifest = getImagesManifest();
  if (!manifest.cloudName) return null;
  const entry = manifest.images[product.slug];
  if (!entry) return null;
  return toLoaderSrc(manifest.cloudName, entry.publicId);
}

export function hasModelImage(slug: string): boolean {
  const manifest = getImagesManifest();
  return Boolean(manifest.cloudName && manifest.images[slug]);
}

export function getImagesCloudName(): string {
  return getImagesManifest().cloudName;
}
