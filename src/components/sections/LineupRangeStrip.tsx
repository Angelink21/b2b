"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { CompareToggle } from "@/components/compare/CompareToggle";
import { Button } from "@/components/ui/Button";
import { selectRangeStripModels, type RangeStripCandidate } from "@/lib/catalog/lineup";
import type { CategorySlug } from "@/lib/catalog/schema";
import { Link } from "@/i18n/navigation";

import { useLineupRange } from "./LineupContext";

export type LineupRangeStripProps = {
  candidates: readonly RangeStripCandidate[];
};

export function LineupRangeStrip({ candidates }: LineupRangeStripProps) {
  const t = useTranslations("home");
  const tCat = useTranslations("categories");
  const tUnits = useTranslations("units");
  const { loKg, hiKg, fullRange } = useLineupRange();

  const models = useMemo(
    () => selectRangeStripModels(candidates, loKg, hiKg, fullRange),
    [candidates, loKg, hiKg, fullRange],
  );

  if (models.length === 0) return null;

  return (
    <section
      className="lineup-range-strip"
      aria-labelledby="lineup-range-strip-heading"
      data-testid="lineup-range-strip"
    >
      <h2 className="lineup-range-strip-heading" id="lineup-range-strip-heading">
        {t("rangeStripHeading")}
      </h2>
      <ul className="lineup-range-strip-list">
        {models.map((model) => (
          <li key={model.slug} className="lineup-range-strip-card" data-slug={model.slug}>
            <Link
              href={`/catalog/${model.category}/${model.slug}`}
              className="lineup-range-strip-media"
              tabIndex={-1}
              aria-hidden="true"
            >
              {model.thumbnailSrc ? (
                <Image
                  src={model.thumbnailSrc}
                  alt=""
                  width={model.thumbW}
                  height={model.thumbH}
                  sizes="120px"
                  unoptimized
                  className="lineup-range-strip-thumb"
                />
              ) : null}
            </Link>
            <div className="lineup-range-strip-body">
              <h3 className="lineup-range-strip-name">{model.name}</h3>
              <p className="lineup-range-strip-stat tabular-nums">
                {model.keyStat}
                {"\u00a0"}
                {tUnits("kg")}
              </p>
              <p className="lineup-range-strip-type">
                {tCat(model.category as CategorySlug)}
              </p>
              <div className="lineup-range-strip-actions">
                <Button
                  href={`/catalog/${model.category}/${model.slug}`}
                  variant="secondary"
                  size="sm"
                >
                  {t("rangeStripDetails")}
                </Button>
                <CompareToggle slug={model.slug} size="sm" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}