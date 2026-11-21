"use server";

import { getModelImage } from "@/lib/images";

import type { GlobalSearchItem } from "./global-search";
import { getAll } from "./queries";

export async function loadGlobalSearchItems(): Promise<GlobalSearchItem[]> {
  const products = await getAll();
  return products.map((product) => {
    const photo = getModelImage(product);
    return {
      slug: product.slug,
      name: product.name,
      category: product.category,
      dimensionsMm: {
        w: product.dimensionsMm.w,
        d: product.dimensionsMm.d,
        h: product.dimensionsMm.h,
      },
      loadKg: product.loadKg
        ? { min: product.loadKg.min, max: product.loadKg.max }
        : null,
      powerKwMax: product.powerKw?.max ?? null,
      workingWidthMm: product.workingWidthMm,
      volumeL: product.volumeL?.value ?? null,
      photo: photo
        ? {
            loaderSrc: photo.loaderSrc,
            width: photo.width,
            height: photo.height,
            alt: photo.alt,
          }
        : null,
    };
  });
}