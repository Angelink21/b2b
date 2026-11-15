import type { ImageLoaderProps } from "next/image";

import { encodeCloudinaryPath } from "./normalize";

export type CloudinaryLoaderOptions = {
  cloudName: string;
  /** Extra transformation segment(s), e.g. "e_trim". */
  extraTransforms?: string;
};

/**
 * Build a Cloudinary delivery URL.
 * Default transforms: f_auto,q_auto,c_limit,w_<width>
 */
export function buildCloudinaryUrl(
  cloudName: string,
  publicId: string,
  width: number,
  opts?: { quality?: number | "auto"; extraTransforms?: string },
): string {
  const parts = ["f_auto", "q_auto", "c_limit", `w_${Math.max(1, Math.round(width))}`];
  if (opts?.extraTransforms) {
    parts.unshift(opts.extraTransforms);
  }
  const transform = parts.join(",");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${encodeCloudinaryPath(publicId)}`;
}

/**
 * next/image loader. `src` is the Cloudinary public_id (no leading slash).
 * Cloud name is expected as a prefix: `cloudName::publicId` so the client
 * bundle does not need env at runtime.
 */
export function cloudinaryLoader({ src, width }: ImageLoaderProps): string {
  const sep = src.indexOf("::");
  if (sep <= 0) {
    throw new Error(
      `cloudinaryLoader expects src "cloudName::publicId", got ${JSON.stringify(src)}`,
    );
  }
  const cloudName = src.slice(0, sep);
  const publicId = src.slice(sep + 2);
  return buildCloudinaryUrl(cloudName, publicId, width);
}

export function cloudinaryTrimLoader({ src, width }: ImageLoaderProps): string {
  const sep = src.indexOf("::");
  if (sep <= 0) {
    throw new Error(
      `cloudinaryTrimLoader expects src "cloudName::publicId", got ${JSON.stringify(src)}`,
    );
  }
  const cloudName = src.slice(0, sep);
  const publicId = src.slice(sep + 2);
  return buildCloudinaryUrl(cloudName, publicId, width, {
    extraTransforms: "e_trim",
  });
}

export function toLoaderSrc(cloudName: string, publicId: string): string {
  return `${cloudName}::${publicId}`;
}
