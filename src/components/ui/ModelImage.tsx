import Image from "next/image";
import { getModelImage } from "@/lib/images";
import type { Product } from "@/lib/catalog/schema";
import { Silhouette } from "./Silhouette";

type ModelImageProps = {
  product: Pick<
    Product,
    "imageKey" | "name" | "category" | "image" | "dimensionsMm"
  >;
  /** CSS aspect-ratio string, default from dimensions when present. */
  aspectRatio?: string;
  targetMaxPx?: number;
  className?: string;
};

/**
 * Photo via getModelImage, otherwise Silhouette. Aspect ratio is always set.
 */
export function ModelImage({
  product,
  aspectRatio,
  targetMaxPx = 240,
  className = "",
}: ModelImageProps) {
  const photo = getModelImage(product);
  const dims = product.dimensionsMm;
  const ratio =
    aspectRatio ??
    (dims ? `${dims.w} / ${dims.h}` : "4 / 5");

  if (photo) {
    return (
      <div
        className={`model-image ${className}`.trim()}
        style={{ aspectRatio: ratio }}
      >
        <Image
          src={photo.url}
          alt={photo.alt ?? product.name}
          width={photo.width}
          height={photo.height}
          className="model-image-photo"
        />
      </div>
    );
  }

  if (!dims) {
    return (
      <div
        className={`model-image model-image-empty ${className}`.trim()}
        style={{ aspectRatio: ratio }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`model-image model-image-silhouette ${className}`.trim()}
      style={{ aspectRatio: ratio }}
    >
      <Silhouette
        widthMm={dims.w}
        heightMm={dims.h}
        targetMaxPx={targetMaxPx}
        title={product.name}
      />
    </div>
  );
}
