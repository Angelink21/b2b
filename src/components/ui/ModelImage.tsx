import { getModelImage } from "@/lib/images";
import type { Product } from "@/lib/catalog/schema";

import { ModelImageView } from "./ModelImageView";

type ModelImageProps = {
  product: Pick<
    Product,
    "slug" | "imageKey" | "name" | "category" | "image" | "dimensionsMm"
  > &
    Partial<Pick<Product, "imageId">>;
  /** CSS aspect-ratio string; default from photo pixels, else dims, else fallback. */
  aspectRatio?: string;
  /** Fill a fixed-height parent well; machines share one floor line. */
  fillWell?: boolean;
  targetMaxPx?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  categoryLabel?: string;
};

/**
 * Server-friendly wrapper: resolves Cloudinary photo, then renders ModelImageView.
 * Do not import this from Client Components — use ModelImageView + a preloaded photo.
 */
export async function ModelImage({
  product,
  aspectRatio,
  fillWell = false,
  targetMaxPx = 240,
  className = "",
  sizes,
  priority = false,
  categoryLabel,
}: ModelImageProps) {
  const photo = await getModelImage(
    product,
    categoryLabel !== undefined ? { categoryLabel } : undefined,
  );

  return (
    <ModelImageView
      product={product}
      photo={photo}
      fillWell={fillWell}
      targetMaxPx={targetMaxPx}
      className={className}
      priority={priority}
      {...(aspectRatio !== undefined ? { aspectRatio } : {})}
      {...(sizes !== undefined ? { sizes } : {})}
    />
  );
}
