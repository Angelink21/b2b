import { ViewTransition } from "react";
import type { ReactNode } from "react";

import { isExpressive } from "@/config/motion";

type ModelSharedTransitionProps = {
  slug: string;
  children: ReactNode;
  className?: string;
};

/**
 * // motion: list name/silhouette shares identity with the model page hero
 */
export function ModelSharedTransition({
  slug,
  children,
  className = "",
}: ModelSharedTransitionProps) {
  if (!isExpressive()) {
    return <span className={className || undefined}>{children}</span>;
  }

  return (
    <ViewTransition name={`model-${slug}`} share="model-share" default="none">
      <span className={`model-vt ${className}`.trim()}>{children}</span>
    </ViewTransition>
  );
}
