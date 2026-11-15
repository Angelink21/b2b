import Image from "next/image";

import { Silhouette } from "@/components/ui/Silhouette";
import { buildCloudinaryUrl, getImagesCloudName, getModelImage } from "@/lib/images";
import type { Product } from "@/lib/catalog/schema";

type LineupMachineVisualProps = {
  product: Pick<
    Product,
    "slug" | "name" | "category" | "imageKey" | "image" | "dimensionsMm"
  >;
  /** Floor-row display size in mm (may differ from front W×H). */
  floorWidthMm: number;
  floorHeightMm: number;
  /** Shared mm→px scale for the lineup scene. */
  scale: number;
  /** When false, always silhouette. */
  usePhotos: boolean;
};

/**
 * Lineup visual: photo in the same floor box as the silhouette (shared mm scale,
 * bottom-aligned), or silhouette.
 */
export function LineupMachineVisual({
  product,
  floorWidthMm,
  floorHeightMm,
  scale,
  usePhotos,
}: LineupMachineVisualProps) {
  const photo = usePhotos ? getModelImage(product) : null;
  const cloudName = getImagesCloudName();
  const boxW = Math.max(1, Math.round(floorWidthMm * scale));
  const boxH = Math.max(1, Math.round(floorHeightMm * scale));

  if (photo && cloudName && photo.publicId) {
    const src = buildCloudinaryUrl(cloudName, photo.publicId, boxW * 2, {
      extraTransforms: "e_trim",
    });

    return (
      <div
        className="lineup-machine-photo-wrap"
        style={{ width: boxW, height: boxH }}
      >
        <Image
          src={src}
          alt=""
          width={boxW}
          height={boxH}
          sizes={`${boxW}px`}
          unoptimized
          className="lineup-machine-photo"
        />
      </div>
    );
  }

  return (
    <Silhouette
      widthMm={floorWidthMm}
      heightMm={floorHeightMm}
      scale={scale}
    />
  );
}
