import type { CSSProperties } from "react";

import { Button } from "@/components/ui/Button";
import { presentFeatureItems } from "@/lib/catalog/present-features";

export type SeriesFeaturesProps = {
  title: string;
  countLabel: string;
  printLabel: string;
  datasheetHref: string;
  items: readonly string[];
  /** BCP 47 for the list body (uk fallback on /en). */
  lang: "uk" | "en";
  note?: string | null;
};

/**
 * Series feature list from «•» bullets: 12-col layout, CSS counters / dashes,
 * optional two-column flow from 1100px when ≥8 items.
 */
export function SeriesFeatures({
  title,
  countLabel,
  printLabel,
  datasheetHref,
  items,
  lang,
  note,
}: SeriesFeaturesProps) {
  const presented = presentFeatureItems(items);
  if (presented.length === 0) return null;

  const useDash = presented.length < 6;
  const useColumns = presented.length >= 8;
  const columnRows = useColumns ? Math.ceil(presented.length / 2) : undefined;

  return (
    <section
      className={[
        "series-features",
        useDash ? "series-features--dash" : "",
        useColumns ? "series-features--columns" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        columnRows
          ? ({
              ["--series-feature-rows"]: String(columnRows),
            } as CSSProperties)
          : undefined
      }
      aria-labelledby="series-features-heading"
    >
      <div className="series-features-head">
        <div className="series-features-title-row">
          <h2 id="series-features-heading" className="series-features-title">
            {title}
          </h2>
          <Button
            href={datasheetHref}
            variant="secondary"
            className="series-features-print no-print"
          >
            {printLabel}
          </Button>
        </div>
        <p className="series-features-count">{countLabel}</p>
        {note ? <p className="model-uk-note series-features-note">{note}</p> : null}
      </div>

      <ul
        className="series-features-list"
        role="list"
        lang={lang}
      >
        {presented.map((text, index) => (
          <li key={`${index}-${text.slice(0, 32)}`} className="series-features-item">
            <span className="series-features-index" aria-hidden="true" />
            <span className="series-features-text">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
