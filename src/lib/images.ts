import type { Product } from "@/lib/catalog/schema";
import { getEnv } from "@/env";

import { buildCloudinaryUrl, toLoaderSrc } from "./images/cloudinary-loader";
import { getImagesManifest } from "./images/manifest";
import { imageKeyToPublicId } from "./images/normalize";
import type { ModelImage, ModelImageEntry } from "./images/types";

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
export {
  probeCloudinaryPublicId,
  cloudinaryDeliveryUrl,
  __setProbeFetchForTests,
} from "./images/probe";

type ProductImageFields = Pick<
  Product,
  "imageKey" | "name" | "category" | "image" | "slug"
> &
  Partial<Pick<Product, "imageId">>;

function resolveCloudName(): string {
  const fromEnv = getEnv().CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  if (fromEnv) return fromEnv;
  return getImagesManifest().cloudName.trim();
}

function resolveFolder(): string {
  const fromEnv = getEnv().CLOUDINARY_FOLDER?.trim() ?? "";
  if (fromEnv) return fromEnv;
  return getImagesManifest().folder.trim();
}

function entryToModelImage(
  product: ProductImageFields,
  entry: ModelImageEntry,
  cloudName: string,
  opts?: { categoryLabel?: string },
): ModelImage {
  const categoryPart = opts?.categoryLabel ?? product.category;
  const alt = `${product.name}, ${categoryPart}`;
  const url = buildCloudinaryUrl(cloudName, entry.publicId, entry.width);
  const result: ModelImage = {
    url,
    width: entry.width,
    height: entry.height,
    alt,
    publicId: entry.publicId,
    loaderSrc: toLoaderSrc(cloudName, entry.publicId),
  };
  if (entry.trimWidth !== undefined) result.trimWidth = entry.trimWidth;
  if (entry.trimHeight !== undefined) result.trimHeight = entry.trimHeight;
  return result;
}

/**
 * Resolve a model photo: build manifest first, else runtime Cloudinary HEAD
 * probe (cached ~5 min). Returns null when cloud name is unset or asset missing.
 */
export async function getModelImage(
  product: ProductImageFields,
  opts?: { categoryLabel?: string },
): Promise<ModelImage | null> {
  const cloudName = resolveCloudName();
  if (!cloudName) return null;

  const manifest = getImagesManifest();
  const fromManifest = manifest.images[product.slug];
  if (fromManifest) {
    return entryToModelImage(product, fromManifest, cloudName, opts);
  }

  const sourceKey = (product.imageId ?? "").trim() || product.imageKey;
  if (!sourceKey.trim()) return null;

  const publicId = imageKeyToPublicId(sourceKey, resolveFolder());
  // Dynamic import keeps unit tests free of Next `'use cache'` / next/cache.
  const { probeCloudinaryPublicIdCached } = await import("./images/probe-cached");
  const probed = await probeCloudinaryPublicIdCached(cloudName, publicId);
  if (!probed) return null;
  return entryToModelImage(product, probed, cloudName, opts);
}

/** Loader `src` value for next/image (cloudName::publicId), or null. */
export async function getModelImageLoaderSrc(
  product: Pick<Product, "slug"> &
    Partial<Pick<Product, "imageKey" | "name" | "category" | "image" | "imageId">>,
): Promise<string | null> {
  if (
    product.imageKey !== undefined &&
    product.name !== undefined &&
    product.category !== undefined
  ) {
    const fields: ProductImageFields = {
      slug: product.slug,
      imageKey: product.imageKey,
      name: product.name,
      category: product.category,
      image: product.image ?? null,
    };
    if (product.imageId !== undefined) fields.imageId = product.imageId;
    const photo = await getModelImage(fields);
    return photo?.loaderSrc ?? null;
  }
  const manifest = getImagesManifest();
  const cloudName = resolveCloudName();
  if (!cloudName) return null;
  const entry = manifest.images[product.slug];
  if (!entry) return null;
  return toLoaderSrc(cloudName, entry.publicId);
}

export async function hasModelImage(
  productOrSlug: string | ProductImageFields,
): Promise<boolean> {
  if (typeof productOrSlug === "string") {
    const manifest = getImagesManifest();
    if (manifest.images[productOrSlug]) return true;
    // Slug-only: cannot probe without imageKey — treat as missing unless
    // already in the sync snapshot.
    return false;
  }
  const photo = await getModelImage(productOrSlug);
  return photo !== null;
}

/** Sync check against the build manifest only (no network). */
export function hasModelImageInManifest(slug: string): boolean {
  const manifest = getImagesManifest();
  return Boolean(resolveCloudName() && manifest.images[slug]);
}

export function getImagesCloudName(): string {
  return resolveCloudName();
}
