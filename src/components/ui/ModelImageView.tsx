import type { ModelImage as ModelImageData } from "@/lib/images/types";
import { IMAGE_FALLBACK_ASPECT_RATIO } from "@/lib/images/types";
import {
  GENERIC_SILHOUETTE_MM,
  getCategoryDef,
  hasRealDimensions,
} from "@/config/categories";
import type { Product } from "@/lib/catalog/schema";
import type { CSSProperties } from "react";

import { ModelImagePhoto } from "./ModelImagePhoto";
import { Silhouette } from "./Silhouette";

export type ModelImageViewProps = {
  product: Pick<Product, "name" | "dimensionsMm" | "category">;
  photo: Pick<
    ModelImageData,
    "loaderSrc" | "alt" | "width" | "height"
  > | null;
  aspectRatio?: string;
  /**
   * Fill a fixed parent well (equal height cards). Skips per-model aspect-ratio
   * so machines share one floor line via object-position: bottom.
   */
  fillWell?: boolean;
  targetMaxPx?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Presentational model visual. Safe for client islands — pass `photo` from the server.
 */
export function ModelImageView({
  product,
  photo,
  aspectRatio,
  fillWell = false,
  targetMaxPx = 240,
  className = "",
  sizes,
  priority = false,
}: ModelImageViewProps) {
  const real = hasRealDimensions(product.dimensionsMm);
  const dims = real ? product.dimensionsMm : GENERIC_SILHOUETTE_MM;
  const variant = getCategoryDef(product.category)?.silhouette ?? "porthole";

  const ratio =
    aspectRatio ??
    (photo && photo.width > 1 && photo.height > 1
      ? `${photo.width} / ${photo.height}`
      : `${dims.w} / ${dims.h}`);

  const boxStyle: CSSProperties | undefined = fillWell
    ? undefined
    : { aspectRatio: ratio || IMAGE_FALLBACK_ASPECT_RATIO };
  const boxClass = [
    "model-image",
    fillWell ? "model-image-well" : "",
    photo ? "model-image-has-photo" : "",
    !photo ? "model-image-silhouette" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (photo) {
    const silhouette = {
      widthMm: dims.w,
      heightMm: dims.h,
      targetMaxPx,
      title: product.name,
      variant,
    };

    return (
      <div className={boxClass} style={boxStyle}>
        <div className="model-image-photo-frame">
          <ModelImagePhoto
            loaderSrc={photo.loaderSrc}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            priority={priority}
            silhouette={silhouette}
            {...(sizes !== undefined ? { sizes } : {})}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={boxClass} style={boxStyle}>
      <Silhouette
        widthMm={dims.w}
        heightMm={dims.h}
        targetMaxPx={targetMaxPx}
        title={product.name}
        variant={variant}
      />
    </div>
  );
}
