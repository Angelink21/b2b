import type { ReactNode } from "react";

export type SpecItem = {
  term: string;
  description: ReactNode;
};

type SpecListProps = {
  items: SpecItem[];
  className?: string;
};

/** Renders only provided items — caller filters empty catalog fields. */
export function SpecList({ items, className = "" }: SpecListProps) {
  if (items.length === 0) return null;

  return (
    <dl className={`spec-list ${className}`.trim()}>
      {items.map((item) => (
        <div key={item.term} className="spec-list-row">
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}
