import Image from "next/image";

import { Silhouette } from "@/components/ui/Silhouette";
import { Link } from "@/i18n/navigation";
import {
  buildCloudinaryUrl,
  getImagesCloudName,
  getModelImage,
} from "@/lib/images";
import type { Product } from "@/lib/catalog/schema";

const WELL_PX = 168;

type FlagshipMediaProps = {
  product: Product;
  categoryLabel: string;
};

/**
 * Equal-height media well: e_trim photo, max-height fill, feet on the floor line.
 * Linked with an accessible name; empty alt stays decorative inside that link.
 */
export async function FlagshipMedia({
  product,
  categoryLabel,
}: FlagshipMediaProps) {
  const photo = await getModelImage(product, { categoryLabel });
  const cloudName = getImagesCloudName();
  const dims = product.dimensionsMm;
  const href = `/catalog/${product.category}/${product.slug}`;

  if (!photo?.publicId || !cloudName) {
    return (
      <Link
        href={href}
        className="flagship-card-media"
        aria-label={product.name}
      >
        {dims ? (
          <Silhouette
            widthMm={dims.w}
            heightMm={dims.h}
            targetMaxPx={WELL_PX - 16}
            title={product.name}
          />
        ) : null}
      </Link>
    );
  }

  const trimW = photo.trimWidth ?? photo.width;
  const trimH = photo.trimHeight ?? photo.height;
  // Retina-ish delivery; e_trim removes canvas padding so feet sit on one line.
  const src = buildCloudinaryUrl(cloudName, photo.publicId, 800, {
    extraTransforms: "e_trim",
  });

  return (
    <Link href={href} className="flagship-card-media" aria-label={product.name}>
      <Image
        src={src}
        alt=""
        width={trimW}
        height={trimH}
        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 280px"
        unoptimized
        className="flagship-card-photo"
      />
    </Link>
  );
}
