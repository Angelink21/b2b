import type { Product } from "@/lib/catalog/schema";

/**
 * Future CMS/CDN photo provider. Stage 2 returns no image.
 */
export type ImageSource = {
  resolve(product: Pick<Product, "imageKey" | "name" | "category">): {
    url: string;
    width: number;
    height: number;
    alt?: string;
  } | null;
};

const nullSource: ImageSource = {
  resolve() {
    return null;
  },
};

let activeSource: ImageSource = nullSource;

/** Override for stage 12 (CMS/CDN). Default: no photos. */
export function setImageSource(source: ImageSource): void {
  activeSource = source;
}

/**
 * Single source of truth for model photos.
 * Until stage 12, always returns null → UI uses Silhouette.
 */
export function getModelImage(
  product: Pick<Product, "imageKey" | "name" | "category" | "image">,
): { url: string; width: number; height: number; alt?: string } | null {
  if (product.image) {
    return product.image;
  }
  return activeSource.resolve(product);
}
