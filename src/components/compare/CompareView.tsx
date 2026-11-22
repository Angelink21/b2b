"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ModelImageView } from "@/components/ui/ModelImageView";
import {
  GENERIC_SILHOUETTE_MM,
  hasRealDimensions,
} from "@/config/categories";
import { Link } from "@/i18n/navigation";
import {
  buildCompareMatrix,
  filterDiffRows,
  serializeCompareSlugs,
  sharedSilhouetteScale,
  type CompareRecord,
} from "@/lib/catalog/compare";
import type { SpecFieldKey } from "@/lib/catalog/spec-groups";
import { initCompareStore } from "@/lib/compare/store";

import { FloorPlanner } from "./FloorPlanner";
import { useCompareSelection } from "./useCompareSelection";

const SILHOUETTE_TARGET = 160;

type CompareViewProps = {
  records: Record<string, CompareRecord>;
  heatingLabels: Partial<Record<string, string>>;
  specLabels: Record<SpecFieldKey, string>;
  categoryLabels: Record<string, string>;
};

export function CompareView({
  records,
  heatingLabels,
  specLabels,
  categoryLabels,
}: CompareViewProps) {
  const t = useTranslations("compare");
  const { selected, remove, ready } = useCompareSelection();
  const [diffOnly, setDiffOnly] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);

  useEffect(() => {
    initCompareStore();
  }, []);

  const products = useMemo(
    () =>
      selected
        .map((slug) => records[slug])
        .filter((item): item is CompareRecord => Boolean(item)),
    [records, selected],
  );

  const matrix = useMemo(() => {
    if (products.length === 0) {
      return { slugs: [], names: [], rows: [] };
    }
    const full = buildCompareMatrix(products, heatingLabels);
    return diffOnly ? filterDiffRows(full) : full;
  }, [diffOnly, heatingLabels, products]);

  const scale = useMemo(() => {
    if (products.length === 0) return 1;
    return sharedSilhouetteScale(products, SILHOUETTE_TARGET);
  }, [products]);

  if (!ready) {
    return (
      <div className="compare-empty">
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="compare-empty">
        <p>{t("empty")}</p>
        <Button href="/catalog" variant="secondary">
          {t("toCatalog")}
        </Button>
      </div>
    );
  }

  const mParam = serializeCompareSlugs(products.map((p) => p.slug));
  const quoteHref = `/quote?m=${encodeURIComponent(mParam)}`;

  async function copyLink() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("m", mParam);
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus(true);
      window.setTimeout(() => setCopyStatus(false), 2000);
    } catch {
      setCopyStatus(false);
    }
  }

  return (
    <div className="compare-view">
      <div className="compare-toolbar">
        <Chip pressed={diffOnly} onPressedChange={setDiffOnly}>
          {t("diffOnly")}
        </Chip>
        <div className="compare-toolbar-actions">
          <Button href={quoteHref} variant="primary">
            {t("quoteSelected")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void copyLink()}>
            {t("copyLink")}
          </Button>
          <a
            href="#floor-planner-title"
            className="compare-planner-jump"
            onClick={(event) => {
              const title = document.getElementById("floor-planner-title");
              if (!title) return;
              event.preventDefault();
              const reduceMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)",
              ).matches;
              title.focus({ preventScroll: true });
              title.scrollIntoView({
                behavior: reduceMotion ? "instant" : "smooth",
                block: "start",
              });
            }}
          >
            {t("toPlanner")}
          </a>
        </div>
        {copyStatus ? (
          <p className="compare-copy-status" role="status">
            {t("copied")}
          </p>
        ) : null}
      </div>

      <div
        className="compare-silhouettes"
        role="group"
        aria-label={t("silhouettesLabel")}
      >
        {products.map((product) => {
          const hMm = hasRealDimensions(product.dimensionsMm)
            ? product.dimensionsMm.h
            : GENERIC_SILHOUETTE_MM.h;
          return (
          <figure key={product.slug} className="compare-silhouette">
            <ModelImageView
              product={product}
              photo={product.photo}
              targetMaxPx={Math.round(hMm * scale)}
              sizes="160px"
            />
            <figcaption>
              <Link href={`/catalog/${product.category}/${product.slug}`}>
                {product.name}
              </Link>
              <span className="text-steel">
                {categoryLabels[product.category] ?? product.category}
              </span>
            </figcaption>
          </figure>
          );
        })}
      </div>

      <div className="data-table-wrap compare-table-wrap">
        <table className="data-table compare-table">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <thead>
            <tr>
              <th scope="col" className="compare-sticky">
                {t("field")}
              </th>
              {products.map((product) => (
                <th scope="col" key={product.slug}>
                  <div className="compare-col-head">
                    <Link href={`/catalog/${product.category}/${product.slug}`}>
                      {product.name}
                    </Link>
                    <button
                      type="button"
                      className="compare-tray-remove"
                      aria-label={t("remove", { name: product.name })}
                      onClick={() => {
                        void remove(product.slug);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="compare-sticky">
                  {specLabels[row.key]}
                </th>
                {row.values.map((value, index) => (
                  <td
                    key={`${row.key}-${products[index]?.slug ?? index}`}
                    className="is-num"
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FloorPlanner products={products} quoteHref={quoteHref} />
    </div>
  );
}
