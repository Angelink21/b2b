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
 *
 * `padSquare`: e_trim then transparent square pad so mixed aspect ratios
 * fill the same box without cropping the machine (compare-tray thumbs).
 */
export function buildCloudinaryUrl(
  cloudName: string,
  publicId: string,
  width: number,
  opts?: { quality?: number | "auto"; extraTransforms?: string; padSquare?: boolean },
): string {
  const w = Math.max(1, Math.round(width));
  const q = opts?.quality === undefined ? "auto" : opts.quality;
  const qSeg = `q_${q}`;

  if (opts?.padSquare) {
    // Chain: trim → pad to square (transparent) → auto format
    const transform = `e_trim/c_pad,b_transparent,w_${w},h_${w},f_auto,${qSeg}`;
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${encodeCloudinaryPath(publicId)}`;
  }

  const parts = ["f_auto", qSeg, "c_limit", `w_${w}`];
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
