"use client";

import Image from "next/image";
import { useState } from "react";

import { cloudinaryLoader } from "@/lib/images/cloudinary-loader";

import { Silhouette } from "./Silhouette";

type ModelImagePhotoProps = {
  loaderSrc: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** When load fails, fall back to silhouette if dims are known. */
  silhouette?: { widthMm: number; heightMm: number; targetMaxPx: number; title: string };
};

/**
 * Client island: Cloudinary photo with load-error → silhouette fallback.
 */
export function ModelImagePhoto({
  loaderSrc,
  alt,
  width,
  height,
  sizes = "(max-width: 768px) 50vw, 240px",
  priority = false,
  className = "",
  silhouette,
}: ModelImagePhotoProps) {
  const [failed, setFailed] = useState(false);

  if (failed && silhouette) {
    return (
      <Silhouette
        widthMm={silhouette.widthMm}
        heightMm={silhouette.heightMm}
        targetMaxPx={silhouette.targetMaxPx}
        title={silhouette.title}
      />
    );
  }

  if (failed) {
    return <div className="model-image-empty" aria-hidden />;
  }

  return (
    <Image
      src={loaderSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      loader={cloudinaryLoader}
      className={`model-image-photo ${className}`.trim()}
      onError={() => setFailed(true)}
    />
  );
}
