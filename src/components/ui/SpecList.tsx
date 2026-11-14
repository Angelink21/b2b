"use client";

import type { ReactNode } from "react";

import {
  useDimHighlight,
  type DimHighlightKind,
} from "@/components/motion/DimHighlight";

export type SpecItem = {
  term: string;
  description: ReactNode;
  /** When set, hovering the row highlights matching dimension lines. */
  dimHighlight?: Exclude<DimHighlightKind, null>;
};

type SpecListProps = {
  items: SpecItem[];
  className?: string;
};

/** Renders only provided items — caller filters empty catalog fields. */
export function SpecList({ items, className = "" }: SpecListProps) {
  const { setActive } = useDimHighlight();

  if (items.length === 0) return null;

  return (
    <dl className={`spec-list ${className}`.trim()}>
      {items.map((item) => (
        <div
          key={item.term}
          className="spec-list-row"
          data-dim={item.dimHighlight ?? undefined}
          onMouseEnter={() => {
            if (item.dimHighlight) setActive(item.dimHighlight);
          }}
          onMouseLeave={() => {
            if (item.dimHighlight) setActive(null);
          }}
          onFocusCapture={() => {
            if (item.dimHighlight) setActive(item.dimHighlight);
          }}
          onBlurCapture={() => {
            if (item.dimHighlight) setActive(null);
          }}
        >
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}
