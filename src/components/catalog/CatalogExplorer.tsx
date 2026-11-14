"use client";

import { useTranslations } from "next-intl";
import { useQueryState, useQueryStates } from "nuqs";
import { useMemo, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { RangeDual } from "@/components/ui/RangeDual";
import { Select } from "@/components/ui/Select";
import { Link, usePathname } from "@/i18n/navigation";
import { serializeCompareSlugs } from "@/lib/catalog/compare";
import { filterProducts, sortProducts } from "@/lib/catalog/query";
import {
  CATEGORY_SLUGS,
  HEATING_KEYS,
  type CatalogIndexItem,
  type CategorySlug,
} from "@/lib/catalog/schema";
import {
  CATALOG_PAGE_SIZE,
  catalogParsers,
  parseAsModelSlugs,
} from "@/lib/catalog/search-params";

import { CatalogScrollRestore } from "./CatalogScrollRestore";
import { CatalogTable } from "./CatalogTable";

export type CatalogExplorerProps = {
  items: CatalogIndexItem[];
  /** When set, category is locked to the route (chips navigate). */
  lockedCategory?: CategorySlug;
  kgBounds: { min: number; max: number };
};

export function CatalogExplorer({
  items,
  lockedCategory,
  kgBounds,
}: CatalogExplorerProps) {
  const t = useTranslations("catalog");
  const tCat = useTranslations("categories");
  const tHeat = useTranslations("heating");
  const pathname = usePathname();

  const [query, setQuery] = useQueryStates(catalogParsers, {
    history: "replace",
    shallow: false,
  });
  const [compareSlugs] = useQueryState("m", parseAsModelSlugs);

  const compareQuery =
    compareSlugs && compareSlugs.length > 0
      ? `?m=${encodeURIComponent(serializeCompareSlugs(compareSlugs))}`
      : "";

  const activeCategory = lockedCategory ?? query.type;

  const filtered = useMemo(() => {
    const category = lockedCategory ?? query.type;
    const filter = {
      ...(category ? { category } : {}),
      ...(query.heat ? { heating: query.heat } : {}),
      ...(query.kg ? { kg: query.kg } : {}),
      ...(query.q ? { q: query.q } : {}),
    };
    let list = filterProducts(items, filter);
    if (query.sort) {
      list = sortProducts(list, query.sort);
    } else {
      list = sortProducts(list, { by: "name", dir: "asc" });
    }
    return list;
  }, [
    items,
    lockedCategory,
    query.heat,
    query.kg,
    query.q,
    query.sort,
    query.type,
  ]);

  const limit = Math.max(CATALOG_PAGE_SIZE, query.limit || CATALOG_PAGE_SIZE);
  const visible = filtered.slice(0, limit);
  const hasMore = visible.length < filtered.length;

  const returnSearch = useMemo(() => {
    const params = new URLSearchParams();
    if (!lockedCategory && query.type) params.set("type", query.type);
    if (query.heat) params.set("heat", query.heat);
    if (query.kg) params.set("kg", `${query.kg.min}-${query.kg.max}`);
    if (query.q) params.set("q", query.q);
    if (query.sort) params.set("sort", `${query.sort.by}:${query.sort.dir}`);
    if (limit !== CATALOG_PAGE_SIZE) params.set("limit", String(limit));
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [
    limit,
    lockedCategory,
    query.heat,
    query.kg,
    query.q,
    query.sort,
    query.type,
  ]);

  const kgValue = query.kg ?? kgBounds;
  const kgActive =
    query.kg !== null &&
    (query.kg.min > kgBounds.min || query.kg.max < kgBounds.max);

  const hasActiveFilters = Boolean(
    query.q ||
      query.heat ||
      query.kg ||
      (!lockedCategory && query.type) ||
      query.sort,
  );

  async function resetAll() {
    await setQuery({
      kg: null,
      type: null,
      heat: null,
      q: "",
      sort: null,
      limit: CATALOG_PAGE_SIZE,
    });
  }

  const empty: ReactNode = (
    <div className="catalog-empty">
      <p>{t("empty")}</p>
      <Button type="button" variant="secondary" onClick={() => void resetAll()}>
        {t("reset")}
      </Button>
    </div>
  );

  return (
    <div className="catalog-explorer">
      <CatalogScrollRestore />

      <div className="catalog-toolbar" role="search">
        <div className="catalog-chips" role="group" aria-label={t("type")}>
          {lockedCategory ? (
            <>
              <Link
                href={`/catalog${compareQuery}`}
                className="chip"
                aria-pressed="false"
              >
                {t("all")}
              </Link>
              {CATEGORY_SLUGS.map((slug) => (
                <Link
                  key={slug}
                  href={`/catalog/${slug}${compareQuery}`}
                  className="chip"
                  aria-pressed={slug === lockedCategory ? "true" : "false"}
                >
                  {tCat(slug)}
                </Link>
              ))}
            </>
          ) : (
            <>
              <Chip
                pressed={!query.type}
                onPressedChange={() => {
                  void setQuery({ type: null, limit: CATALOG_PAGE_SIZE });
                }}
              >
                {t("all")}
              </Chip>
              {CATEGORY_SLUGS.map((slug) => (
                <Chip
                  key={slug}
                  pressed={query.type === slug}
                  onPressedChange={() => {
                    void setQuery({
                      type: query.type === slug ? null : slug,
                      limit: CATALOG_PAGE_SIZE,
                    });
                  }}
                >
                  {tCat(slug)}
                </Chip>
              ))}
            </>
          )}
        </div>

        <div className="catalog-filters">
          <Field id="catalog-q" label={t("search")}>
            <Input
              id="catalog-q"
              value={query.q}
              onChange={(event) => {
                void setQuery({
                  q: event.target.value,
                  limit: CATALOG_PAGE_SIZE,
                });
              }}
              autoComplete="off"
            />
          </Field>

          <Field id="catalog-heat" label={t("heating")}>
            <Select
              id="catalog-heat"
              value={query.heat ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                void setQuery({
                  heat:
                    value === ""
                      ? null
                      : (value as (typeof HEATING_KEYS)[number]),
                  limit: CATALOG_PAGE_SIZE,
                });
              }}
            >
              <option value="">{t("anyHeating")}</option>
              {HEATING_KEYS.map((key) => (
                <option key={key} value={key}>
                  {tHeat(key)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="catalog-kg">
          <p className="catalog-kg-label">{t("load")}</p>
          <RangeDual
            min={kgBounds.min}
            max={kgBounds.max}
            valueMin={kgValue.min}
            valueMax={kgValue.max}
            step={1}
            unit={t("kg")}
            valueTextFrom={t("from")}
            valueTextTo={t("to")}
            labelMin={t("kgMin")}
            labelMax={t("kgMax")}
            onChange={({ min, max }) => {
              const full = min <= kgBounds.min && max >= kgBounds.max;
              void setQuery({
                kg: full ? null : { min, max },
                limit: CATALOG_PAGE_SIZE,
              });
            }}
          />
          {kgActive ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                void setQuery({ kg: null, limit: CATALOG_PAGE_SIZE });
              }}
            >
              {t("resetKg")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="catalog-meta" aria-live="polite">
        <span>{t("models", { count: filtered.length })}</span>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => void resetAll()}
          >
            {t("reset")}
          </Button>
        ) : null}
      </div>

      <CatalogTable
        rows={visible}
        category={activeCategory}
        sort={query.sort}
        onSortChange={(next) => {
          void setQuery({ sort: next });
        }}
        returnPathname={pathname}
        returnSearch={returnSearch}
        empty={empty}
      />

      {hasMore ? (
        <div className="catalog-more">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void setQuery({ limit: limit + CATALOG_PAGE_SIZE });
            }}
          >
            {t("more")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
