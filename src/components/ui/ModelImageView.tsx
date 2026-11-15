import type { ModelImage as ModelImageData } from "@/lib/images/types";
import { IMAGE_FALLBACK_ASPECT_RATIO } from "@/lib/images/types";
import type { Product } from "@/lib/catalog/schema";
import type { CSSProperties } from "react";

import { ModelImagePhoto } from "./ModelImagePhoto";
import { Silhouette } from "./Silhouette";

export type ModelImageViewProps = {
  product: Pick<Product, "name" | "dimensionsMm">;
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
  const dims = product.dimensionsMm;

  const ratio =
    aspectRatio ??
    (photo && photo.width > 1 && photo.height > 1
      ? `${photo.width} / ${photo.height}`
      : dims
        ? `${dims.w} / ${dims.h}`
        : IMAGE_FALLBACK_ASPECT_RATIO);

  const boxStyle: CSSProperties | undefined = fillWell
    ? undefined
    : { aspectRatio: ratio };
  const boxClass = [
    "model-image",
    fillWell ? "model-image-well" : "",
    photo ? "model-image-has-photo" : "",
    !photo && dims ? "model-image-silhouette" : "",
    !photo && !dims ? "model-image-empty" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (photo) {
    const silhouette = dims
      ? {
          widthMm: dims.w,
          heightMm: dims.h,
          targetMaxPx,
          title: product.name,
        }
      : undefined;

    return (
      <div className={boxClass} style={boxStyle}>
        <div className="model-image-photo-frame">
          <ModelImagePhoto
            loaderSrc={photo.loaderSrc}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            priority={priority}
            {...(sizes !== undefined ? { sizes } : {})}
            {...(silhouette !== undefined ? { silhouette } : {})}
          />
        </div>
      </div>
    );
  }

  if (!dims) {
    return <div className={boxClass} style={boxStyle} aria-hidden />;
  }

  return (
    <div className={boxClass} style={boxStyle}>
      <Silhouette
        widthMm={dims.w}
        heightMm={dims.h}
        targetMaxPx={targetMaxPx}
        title={product.name}
      />
    </div>
  );
}
