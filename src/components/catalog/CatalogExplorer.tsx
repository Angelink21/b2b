"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Grid } from "@/components/ui/Grid";
import { Input } from "@/components/ui/Input";
import { RangeDual } from "@/components/ui/RangeDual";
import { Select } from "@/components/ui/Select";
import {
  dimensionFilterAllowed,
  facetAllowed,
  facetsForCategory,
  sortAllowed,
  type RangeFacet,
} from "@/config/facets";
import {
  countHiddenWithoutDimensions,
  dimensionFilterActive,
  type DimensionMaxFilter,
} from "@/lib/catalog/dimension-filter";
import { Link, usePathname } from "@/i18n/navigation";
import {
  formatCatalogBound,
  formatLoadNumber,
} from "@/lib/catalog/format";
import {
  defaultCatalogSort,
  facetRangeBounds,
  filterProducts,
  sortProducts,
} from "@/lib/catalog/query";
import {
  CATEGORY_SLUGS,
  HEATING_KEYS,
  type CatalogIndexItem,
  type CategorySlug,
  type HeatingKey,
} from "@/lib/catalog/schema";
import {
  CATALOG_PAGE_SIZE,
  catalogParsers,
  type CatalogQueryState,
  type KgRangeParam,
} from "@/lib/catalog/search-params";

import { CatalogReturnTracker } from "./CatalogReturnTracker";
import { CatalogScrollRestore } from "./CatalogScrollRestore";
import { CatalogTable } from "./CatalogTable";

export type CatalogExplorerProps = {
  items: CatalogIndexItem[];
  /** When set, category is locked to the route (list navigates). */
  lockedCategory?: CategorySlug;
  categoryCounts: Record<CategorySlug, number>;
};

const RANGE_STEP: Record<RangeFacet, number> = {
  kg: 1,
  power: 0.1,
  width: 1,
  speed: 0.1,
  volume: 1,
};

/** Side panel from this width; below — filter sheet. Raised to 1280 after a–c. */
const DESKTOP_FILTERS_MQ = "(min-width: 1280px)";

function tighten(
  range: KgRangeParam | null,
  bounds: { min: number; max: number } | null,
): KgRangeParam | null {
  if (!range || !bounds) return null;
  if (range.max < bounds.min || range.min > bounds.max) return null;
  const min = Math.max(range.min, bounds.min);
  const max = Math.min(range.max, bounds.max);
  if (min <= bounds.min && max >= bounds.max) return null;
  return { min, max };
}

export function CatalogExplorer({
  items,
  lockedCategory,
  categoryCounts,
}: CatalogExplorerProps) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const tCat = useTranslations("categories");
  const tHeat = useTranslations("heating");
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useQueryStates(catalogParsers, {
    history: "replace",
    shallow: false,
  });
  const activeCategory = lockedCategory ?? query.type;
  // All-categories view hides range controls, but a lineup link may still pass ?kg=.
  const allowed = useMemo(() => {
    if (activeCategory) return facetsForCategory(activeCategory);
    const extra: RangeFacet[] = [];
    if (query.kg) extra.push("kg");
    if (query.power) extra.push("power");
    if (query.width) extra.push("width");
    if (query.speed) extra.push("speed");
    if (query.volume) extra.push("volume");
    return [...facetsForCategory(null), ...extra];
  }, [activeCategory, query.kg, query.power, query.speed, query.volume, query.width]);

  const pool = useMemo(
    () =>
      activeCategory ? items.filter((item) => item.category === activeCategory) : items,
    [activeCategory, items],
  );

  /** Exact min/max from category data; slider step snaps thumbs internally. */
  const bounds = useMemo(() => {
    const next = {} as Record<RangeFacet, { min: number; max: number } | null>;
    for (const facet of ["kg", "power", "width", "speed", "volume"] as const) {
      const fromLineup = !activeCategory && query[facet] !== null;
      next[facet] =
        facetAllowed(activeCategory, facet) || fromLineup
          ? facetRangeBounds(pool, facet)
          : null;
    }
    return next;
  }, [activeCategory, pool, query]);

  useEffect(() => {
    const patch: Partial<CatalogQueryState> = {};
    if (!dimensionFilterAllowed(activeCategory)) {
      if (query.w) patch.w = null;
      if (query.d) patch.d = null;
      if (query.h) patch.h = null;
    }
    if (activeCategory && query.kg && !bounds.kg) patch.kg = null;
    if (activeCategory && query.power && !bounds.power) patch.power = null;
    if (activeCategory && query.width && !bounds.width) patch.width = null;
    if (activeCategory && query.speed && !bounds.speed) patch.speed = null;
    if (activeCategory && query.volume && !bounds.volume) patch.volume = null;
    if (query.heat && !facetAllowed(activeCategory, "heating")) patch.heat = null;
    if (query.sort && !sortAllowed(activeCategory, query.sort)) patch.sort = null;
    if (Object.keys(patch).length > 0) {
      void setQuery(patch);
    }
  }, [
    activeCategory,
    bounds.kg,
    bounds.power,
    bounds.speed,
    bounds.volume,
    bounds.width,
    query.heat,
    query.kg,
    query.power,
    query.sort,
    query.speed,
    query.volume,
    query.width,
    query.w,
    query.d,
    query.h,
    setQuery,
  ]);

  useEffect(() => {
    rootRef.current?.setAttribute("data-filters-ready", "true");
  }, []);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_FILTERS_MQ);
    const closeOnDesktop = () => {
      if (media.matches) setSheetOpen(false);
    };
    closeOnDesktop();
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const root = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusable()[0]?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSheetOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      if (previouslyFocused && previouslyFocused !== document.body) {
        previouslyFocused.focus();
      }
    };
  }, [sheetOpen]);

  const dimensionMax = useMemo((): DimensionMaxFilter => {
    if (!dimensionFilterAllowed(activeCategory)) {
      return {};
    }
    const filter: DimensionMaxFilter = {};
    if (query.w != null) filter.w = query.w;
    if (query.d != null) filter.d = query.d;
    if (query.h != null) filter.h = query.h;
    return filter;
  }, [activeCategory, query.d, query.h, query.w]);

  const applied = useMemo(() => {
    return {
      kg: bounds.kg ? tighten(query.kg, bounds.kg) : null,
      power: bounds.power ? tighten(query.power, bounds.power) : null,
      width: bounds.width ? tighten(query.width, bounds.width) : null,
      speed: bounds.speed ? tighten(query.speed, bounds.speed) : null,
      volume: bounds.volume ? tighten(query.volume, bounds.volume) : null,
      heat: facetAllowed(activeCategory, "heating") ? query.heat : null,
      sort: sortAllowed(activeCategory, query.sort) ? query.sort : null,
      dimensionsMax: dimensionFilterActive(dimensionMax) ? dimensionMax : null,
    };
  }, [activeCategory, bounds, dimensionMax, query]);

  const filtered = useMemo(() => {
    const filter = {
      ...(activeCategory ? { category: activeCategory } : {}),
      ...(applied.heat ? { heating: applied.heat } : {}),
      ...(applied.kg ? { kg: applied.kg } : {}),
      ...(applied.power ? { power: applied.power } : {}),
      ...(applied.width ? { width: applied.width } : {}),
      ...(applied.speed ? { speed: applied.speed } : {}),
      ...(applied.volume ? { volume: applied.volume } : {}),
      ...(applied.dimensionsMax ? { dimensionsMax: applied.dimensionsMax } : {}),
      ...(query.q ? { q: query.q } : {}),
      allowed,
    };
    let list = filterProducts(items, filter);
    const sort = applied.sort ?? defaultCatalogSort(activeCategory);
    list = sortProducts(list, sort, {
      groupByCategory: !applied.sort && !activeCategory,
    });
    return list;
  }, [activeCategory, allowed, applied, items, query.q]);

  const hiddenWithoutDimensions = useMemo(() => {
    if (!applied.dimensionsMax) return 0;
    const filter = {
      ...(activeCategory ? { category: activeCategory } : {}),
      ...(applied.heat ? { heating: applied.heat } : {}),
      ...(applied.kg ? { kg: applied.kg } : {}),
      ...(applied.power ? { power: applied.power } : {}),
      ...(applied.width ? { width: applied.width } : {}),
      ...(applied.speed ? { speed: applied.speed } : {}),
      ...(applied.volume ? { volume: applied.volume } : {}),
      ...(query.q ? { q: query.q } : {}),
      allowed,
    };
    const base = filterProducts(items, filter);
    return countHiddenWithoutDimensions(base, applied.dimensionsMax);
  }, [activeCategory, allowed, applied, items, query.q]);

  const limit = Math.max(CATALOG_PAGE_SIZE, query.limit || CATALOG_PAGE_SIZE);
  const visible = filtered.slice(0, limit);
  const hasMore = visible.length < filtered.length;

  const returnSearch = useMemo(() => {
    const params = new URLSearchParams();
    if (!lockedCategory && activeCategory) params.set("type", activeCategory);
    if (applied.heat) params.set("heat", applied.heat);
    if (applied.kg) params.set("kg", `${applied.kg.min}-${applied.kg.max}`);
    if (applied.power) params.set("power", `${applied.power.min}-${applied.power.max}`);
    if (applied.width) params.set("width", `${applied.width.min}-${applied.width.max}`);
    if (applied.speed) params.set("speed", `${applied.speed.min}-${applied.speed.max}`);
    if (applied.volume)
      params.set("volume", `${applied.volume.min}-${applied.volume.max}`);
    if (query.w) params.set("w", String(query.w));
    if (query.d) params.set("d", String(query.d));
    if (query.h) params.set("h", String(query.h));
    if (query.q) params.set("q", query.q);
    if (applied.sort) params.set("sort", `${applied.sort.by}:${applied.sort.dir}`);
    if (limit !== CATALOG_PAGE_SIZE) params.set("limit", String(limit));
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [
    activeCategory,
    applied,
    limit,
    lockedCategory,
    query.d,
    query.h,
    query.q,
    query.w,
  ]);

  const heatKeys = useMemo(
    () => HEATING_KEYS.filter((key) => pool.some((item) => item.heating === key)),
    [pool],
  );

  const hasActiveFilters = Boolean(
    query.q ||
    applied.heat ||
    applied.kg ||
    applied.power ||
    applied.width ||
    applied.speed ||
    applied.volume ||
    query.w ||
    query.d ||
    query.h ||
    (!lockedCategory && query.type) ||
    applied.sort,
  );

  function selectCategory(next: CategorySlug | null) {
    const nextBounds = (facet: RangeFacet) =>
      facetAllowed(next, facet)
        ? facetRangeBounds(
            next ? items.filter((item) => item.category === next) : items,
            facet,
          )
        : null;
    void setQuery({
      type: lockedCategory ? query.type : next,
      kg: tighten(query.kg, nextBounds("kg")),
      power: tighten(query.power, nextBounds("power")),
      width: tighten(query.width, nextBounds("width")),
      speed: tighten(query.speed, nextBounds("speed")),
      volume: tighten(query.volume, nextBounds("volume")),
      heat: facetAllowed(next, "heating") ? query.heat : null,
      sort: sortAllowed(next, query.sort) ? query.sort : null,
      limit: CATALOG_PAGE_SIZE,
    });
  }

  async function resetAll() {
    await setQuery({
      kg: null,
      power: null,
      width: null,
      speed: null,
      volume: null,
      w: null,
      d: null,
      h: null,
      type: null,
      heat: null,
      q: "",
      sort: null,
      limit: CATALOG_PAGE_SIZE,
    });
  }

  function rangeValue(facet: RangeFacet): { min: number; max: number } | null {
    const edge = bounds[facet];
    if (!edge) return null;
    const current = applied[facet] ?? edge;
    return { min: current.min, max: current.max };
  }

  function onRange(facet: RangeFacet, next: { min: number; max: number }) {
    const edge = bounds[facet];
    const full = edge !== null && next.min <= edge.min && next.max >= edge.max;
    void setQuery({
      [facet]: full ? null : next,
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

  const rangeCopy: Record<
    RangeFacet,
    { label: string; unit: string; min: string; max: string }
  > = {
    kg: {
      label: t("rangeLoad"),
      unit: t("kg"),
      min: t("kgMin"),
      max: t("kgMax"),
    },
    power: {
      label: t("rangePower"),
      unit: t("unitKw"),
      min: t("powerMin"),
      max: t("powerMax"),
    },
    width: {
      label: t("rangeWidth"),
      unit: t("unitMm"),
      min: t("widthMin"),
      max: t("widthMax"),
    },
    speed: {
      label: t("rangeSpeed"),
      unit: t("unitMpm"),
      min: t("speedMin"),
      max: t("speedMax"),
    },
    volume: {
      label: t("rangeVolume"),
      unit: t("unitL"),
      min: t("volumeMin"),
      max: t("volumeMax"),
    },
  };

  const orphanDimensions = (["w", "d", "h"] as const).flatMap((axis) => {
    if (dimensionFilterAllowed(activeCategory)) return [];
    const value = query[axis];
    if (!value) return [];
    const label = t(`activeDimension${axis.toUpperCase()}` as "activeDimensionW", {
      value: formatCatalogBound(locale, value, 10),
    });
    return [{ axis, label }];
  });

  const orphanRanges = (["kg", "power", "width", "speed", "volume"] as const).flatMap(
    (facet) => {
      if (facetAllowed(activeCategory, facet)) return [];
      const value = applied[facet];
      if (!value) return [];
      const label = t("activeRange", {
        min:
          facet === "kg"
            ? formatLoadNumber(locale, value.min)
            : formatCatalogBound(locale, value.min, RANGE_STEP[facet]),
        max:
          facet === "kg"
            ? formatLoadNumber(locale, value.max)
            : formatCatalogBound(locale, value.max, RANGE_STEP[facet]),
        unit: rangeCopy[facet].unit,
      });
      return [{ facet, label }];
    },
  );

  const totalCount = CATEGORY_SLUGS.reduce(
    (sum, slug) => sum + (categoryCounts[slug] ?? 0),
    0,
  );

  return (
    <div ref={rootRef} className="catalog-explorer" data-filters-ready="false">
      <CatalogReturnTracker pathname={pathname} search={returnSearch} />
      <CatalogScrollRestore />
      <Grid className="catalog-layout">
        <div className="catalog-results">
          <div className="catalog-results-bar">
            <button
              ref={toggleRef}
              type="button"
              className="catalog-filters-toggle btn"
              aria-expanded={sheetOpen}
              aria-controls="catalog-filters"
              onClick={() => setSheetOpen(true)}
            >
              {t("filters")}
            </button>
            <div className="catalog-meta" aria-live="polite">
              <span>{t("models", { count: filtered.length })}</span>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="catalog-reset"
                  onClick={() => void resetAll()}
                >
                  {t("reset")}
                </button>
              ) : null}
            </div>
          </div>

          {orphanDimensions.length > 0 || orphanRanges.length > 0 ? (
            <div className="catalog-active-filters">
              {orphanDimensions.map((item) => (
                <button
                  key={item.axis}
                  type="button"
                  className="chip catalog-active-chip"
                  aria-label={t("clearActiveFilter", { value: item.label })}
                  onClick={() => {
                    void setQuery({ [item.axis]: null, limit: CATALOG_PAGE_SIZE });
                  }}
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              {orphanRanges.map((item) => (
                <button
                  key={item.facet}
                  type="button"
                  className="chip catalog-active-chip"
                  aria-label={t("clearActiveFilter", { value: item.label })}
                  onClick={() => {
                    void setQuery({ [item.facet]: null, limit: CATALOG_PAGE_SIZE });
                  }}
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}

          {hiddenWithoutDimensions > 0 ? (
            <p className="catalog-dimension-note">
              {t("hiddenWithoutDimensions", { count: hiddenWithoutDimensions })}
            </p>
          ) : null}

          {dimensionFilterAllowed(activeCategory) &&
          dimensionFilterActive(dimensionMax) ? (
            <div className="catalog-active-filters">
              {(["w", "d", "h"] as const).flatMap((axis) => {
                const value = query[axis];
                if (!value) return [];
                const label = t(`activeDimension${axis.toUpperCase()}` as "activeDimensionW", {
                  value: formatCatalogBound(locale, value, 10),
                });
                return (
                  <button
                    key={axis}
                    type="button"
                    className="chip catalog-active-chip"
                    aria-label={t("clearActiveFilter", { value: label })}
                    onClick={() => {
                      void setQuery({ [axis]: null, limit: CATALOG_PAGE_SIZE });
                    }}
                  >
                    <span>{label}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <CatalogTable
            rows={visible}
            category={activeCategory}
            sort={applied.sort}
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

        <aside
          ref={panelRef}
          id="catalog-filters"
          className={sheetOpen ? "catalog-panel is-open" : "catalog-panel"}
          {...(sheetOpen
            ? { role: "dialog" as const, "aria-modal": true, "aria-label": t("filters") }
            : { "aria-label": t("filters") })}
        >
          {sheetOpen ? (
            <button
              type="button"
              className="catalog-filters-close btn"
              onClick={() => {
                setSheetOpen(false);
                toggleRef.current?.focus();
              }}
            >
              {t("closeFilters")}
            </button>
          ) : null}

          <nav className="catalog-cat-list" aria-label={t("type")}>
            {lockedCategory ? (
              <>
                <Link href="/catalog" className="catalog-cat-row">
                  <span className="catalog-cat-name">{t("all")}</span>
                  <span className="catalog-cat-count">{totalCount}</span>
                </Link>
                {CATEGORY_SLUGS.map((slug) => {
                  const active = slug === lockedCategory;
                  return (
                    <Link
                      key={slug}
                      href={`/catalog/${slug}`}
                      className={
                        active
                          ? "catalog-cat-row is-active"
                          : "catalog-cat-row"
                      }
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="catalog-cat-name">{tCat(slug)}</span>
                      <span className="catalog-cat-count">
                        {categoryCounts[slug] ?? 0}
                      </span>
                    </Link>
                  );
                })}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={
                    !query.type
                      ? "catalog-cat-row is-active"
                      : "catalog-cat-row"
                  }
                  aria-pressed={!query.type}
                  onClick={() => selectCategory(null)}
                >
                  <span className="catalog-cat-name">{t("all")}</span>
                  <span className="catalog-cat-count">{totalCount}</span>
                </button>
                {CATEGORY_SLUGS.map((slug) => {
                  const active = query.type === slug;
                  return (
                    <button
                      key={slug}
                      type="button"
                      className={
                        active
                          ? "catalog-cat-row is-active"
                          : "catalog-cat-row"
                      }
                      aria-pressed={active}
                      onClick={() =>
                        selectCategory(query.type === slug ? null : slug)
                      }
                    >
                      <span className="catalog-cat-name">{tCat(slug)}</span>
                      <span className="catalog-cat-count">
                        {categoryCounts[slug] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </nav>

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

          {facetAllowed(activeCategory, "heating") && heatKeys.length > 0 ? (
            <Field id="catalog-heat" label={t("heating")}>
              <Select
                id="catalog-heat"
                value={applied.heat ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  void setQuery({
                    heat: value === "" ? null : (value as HeatingKey),
                    limit: CATALOG_PAGE_SIZE,
                  });
                }}
              >
                <option value="">{t("anyHeating")}</option>
                {heatKeys.map((key) => (
                  <option key={key} value={key}>
                    {tHeat(key)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {dimensionFilterAllowed(activeCategory) ? (
            <div className="catalog-dimension-filters">
              <p className="catalog-kg-label">{t("dimensionFilters")}</p>
              {(["w", "d", "h"] as const).map((axis) => (
                <Field
                  key={axis}
                  id={`catalog-dim-${axis}`}
                  label={t(`dimensionMax${axis.toUpperCase()}` as "dimensionMaxW")}
                >
                  <Input
                    id={`catalog-dim-${axis}`}
                    type="number"
                    inputMode="numeric"
                    step={10}
                    min={10}
                    value={query[axis] ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      void setQuery({
                        [axis]: raw === "" ? null : Number(raw),
                        limit: CATALOG_PAGE_SIZE,
                      });
                    }}
                  />
                </Field>
              ))}
            </div>
          ) : null}

          {(["kg", "power", "width", "speed", "volume"] as const).map((facet) => {
            if (!facetAllowed(activeCategory, facet)) return null;
            const edge = bounds[facet];
            const value = rangeValue(facet);
            if (!edge || !value) return null;
            const copy = rangeCopy[facet];
            const active = applied[facet] !== null;
            const formatEdge = (n: number) =>
              facet === "kg"
                ? formatLoadNumber(locale, n)
                : formatCatalogBound(locale, n, RANGE_STEP[facet]);
            const readout = t("activeRangeValues", {
              min: formatEdge(value.min),
              max: formatEdge(value.max),
            });
            return (
              <div key={facet} className="catalog-range">
                <div className="catalog-range-head">
                  <p className="catalog-kg-label">{copy.label}</p>
                  <p className="catalog-range-value">{readout}</p>
                </div>
                <RangeDual
                  min={edge.min}
                  max={edge.max}
                  valueMin={value.min}
                  valueMax={value.max}
                  step={RANGE_STEP[facet]}
                  unit={copy.unit}
                  valueTextFrom={t("from")}
                  valueTextTo={t("to")}
                  labelMin={copy.min}
                  labelMax={copy.max}
                  onChange={(next) => onRange(facet, next)}
                />
                {active ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      void setQuery({ [facet]: null, limit: CATALOG_PAGE_SIZE });
                    }}
                  >
                    {t("resetRange")}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </aside>
      </Grid>
    </div>
  );
}
