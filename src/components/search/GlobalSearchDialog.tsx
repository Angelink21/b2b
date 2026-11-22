"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { CompareToggle } from "@/components/compare/CompareToggle";
import { useSiteChrome } from "@/components/layout/SiteChromeContext";
import { Silhouette } from "@/components/ui/Silhouette";
import {
  GENERIC_SILHOUETTE_MM,
  getCategoryDef,
  hasRealDimensions,
} from "@/config/categories";
import { CATEGORY_SLUGS } from "@/lib/catalog/schema";
import { formatIndexKeyMetric } from "@/lib/catalog/format";
import { loadGlobalSearchItems } from "@/lib/catalog/global-search-data";
import {
  groupSearchResults,
  readRecentModelSlugs,
  recentSearchItems,
  rememberModelSlug,
  type GlobalSearchItem,
  type SearchResultGroup,
} from "@/lib/catalog/global-search";
import { Link, useRouter } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { ModelImagePhoto } from "@/components/ui/ModelImagePhoto";

const ModelImagePhotoClient = ModelImagePhoto;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusable(root: ParentNode | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[hidden]") && !el.hasAttribute("disabled"),
  );
}

type FlatRow =
  | { kind: "heading"; category: (typeof CATEGORY_SLUGS)[number] }
  | { kind: "item"; item: GlobalSearchItem; index: number };

function flattenGroups(groups: SearchResultGroup[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const group of groups) {
    rows.push({ kind: "heading", category: group.category });
    for (const item of group.items) {
      rows.push({
        kind: "item",
        item,
        index: rows.filter((r) => r.kind === "item").length,
      });
    }
  }
  return rows;
}

function SearchGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle
        cx="8.5"
        cy="8.5"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function GlobalSearchDialog() {
  const t = useTranslations("search");
  const tCat = useTranslations("categories");
  const tUnits = useTranslations("units");
  const locale = useLocale();
  const router = useRouter();
  const inputId = useId();
  const { searchOpen, closeSearch } = useSiteChrome();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const [items, setItems] = useState<GlobalSearchItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const units = useMemo(
    () => ({
      kg: tUnits("kg"),
      mm: tUnits("mm"),
      L: tUnits("L"),
      kW: tUnits("kW"),
    }),
    [tUnits],
  );

  useEffect(() => {
    if (!searchOpen) return;
    trackEvent("search_open");
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (items !== null || loading) return;
    const frame = requestAnimationFrame(() => {
      setLoading(true);
      void loadGlobalSearchItems()
        .then((next) => setItems(next))
        .finally(() => setLoading(false));
    });
    return () => cancelAnimationFrame(frame);
  }, [items, loading, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const main = document.getElementById("main");
    const footer = document.querySelector("footer");
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const list = visibleFocusable(dialog);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !list.includes(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
      const focusTarget = returnFocusRef.current;
      if (focusTarget && document.contains(focusTarget)) {
        focusTarget.focus();
      }
    };
  }, [closeSearch, searchOpen]);

  const trimmed = query.trim();
  const groups = useMemo(() => {
    if (!items) return [];
    if (!trimmed) return [];
    return groupSearchResults(items, trimmed);
  }, [items, trimmed]);

  const recent = useMemo(() => {
    if (!items || trimmed) return [];
    return recentSearchItems(items, readRecentModelSlugs());
  }, [items, trimmed]);

  const flatItems = useMemo(() => {
    if (trimmed) {
      return flattenGroups(groups).filter((row) => row.kind === "item");
    }
    return recent.map((item, index) => ({
      kind: "item" as const,
      item,
      index,
    }));
  }, [groups, recent, trimmed]);

  const safeActiveIndex =
    flatItems.length === 0
      ? 0
      : Math.min(activeIndex, flatItems.length - 1);

  const navigate = useCallback(
    (item: GlobalSearchItem) => {
      rememberModelSlug(item.slug);
      trackEvent("search_select");
      closeSearch();
      router.push(`/catalog/${item.category}/${item.slug}`);
    },
    [closeSearch, router],
  );

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flatItems.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter" && flatItems[safeActiveIndex]) {
      event.preventDefault();
      navigate(flatItems[safeActiveIndex].item);
    }
  }

  if (!searchOpen) return null;

  const showCategories = !trimmed && recent.length === 0;

  return (
    <div className="search-backdrop" onMouseDown={closeSearch}>
      <div
        ref={dialogRef}
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("open")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <label className="search-field" htmlFor={inputId}>
          <SearchGlyph />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder={t("placeholder")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
          />
        </label>

        <div className="search-results">
          {loading && items === null ? (
            <p className="search-empty">{t("loading")}</p>
          ) : null}

          {trimmed && groups.length === 0 && !loading ? (
            <div className="search-empty-block">
              <p>{t("noResults")}</p>
              <div className="search-empty-links">
                <Link href="/catalog" onClick={closeSearch}>
                  {t("browseCatalog")}
                </Link>
                <Link href="/quote" onClick={closeSearch}>
                  {t("requestQuote")}
                </Link>
              </div>
            </div>
          ) : null}

          {showCategories ? (
            <>
              <p className="search-section-label">{t("categories")}</p>
              <ul className="search-category-list">
                {CATEGORY_SLUGS.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/catalog/${slug}`}
                      className="search-category-link"
                      onClick={closeSearch}
                    >
                      {tCat(slug)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {trimmed && groups.length > 0 ? (
            <div role="listbox" aria-label={t("results")}>
              {groups.map((group) => (
                <div key={group.category} className="search-group">
                  <p className="search-section-label">{tCat(group.category)}</p>
                  <div className="search-hit-list">
                    {group.items.map((item) => {
                      const idx = flatItems.findIndex(
                        (row) => row.item.slug === item.slug,
                      );
                      const active = idx === safeActiveIndex;
                      return (
                        <div
                          key={item.slug}
                          className={
                            active
                              ? "search-hit-row is-active"
                              : "search-hit-row"
                          }
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          <button
                            type="button"
                            className="search-hit"
                            onClick={() => navigate(item)}
                          >
                            <SearchHitVisual item={item} />
                            <span className="search-hit-copy">
                              <span className="search-hit-name">
                                {item.name}
                              </span>
                              <span className="search-hit-metric">
                                {formatIndexKeyMetric(item, units, locale)}
                              </span>
                            </span>
                          </button>
                          <CompareToggle
                            slug={item.slug}
                            size="sm"
                            className="search-hit-compare"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!trimmed && recent.length > 0 ? (
            <>
              <p className="search-section-label">{t("recent")}</p>
              <div
                className="search-hit-list"
                role="listbox"
                aria-label={t("results")}
              >
                {recent.map((item, idx) => {
                  const active = idx === safeActiveIndex;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      className={active ? "search-hit is-active" : "search-hit"}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => navigate(item)}
                    >
                      <SearchHitVisual item={item} />
                      <span className="search-hit-copy">
                        <span className="search-hit-name">{item.name}</span>
                        <span className="search-hit-metric">
                          {formatIndexKeyMetric(item, units, locale)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SearchHitVisual({ item }: { item: GlobalSearchItem }) {
  const real = hasRealDimensions(item.dimensionsMm);
  const dims = real ? item.dimensionsMm : GENERIC_SILHOUETTE_MM;
  const variant = getCategoryDef(item.category)?.silhouette ?? "porthole";
  if (item.photo) {
    const silhouette = {
      widthMm: dims.w,
      heightMm: dims.h,
      targetMaxPx: 48,
      title: item.name,
      variant,
    };
    return (
      <span className="search-hit-visual">
        <ModelImagePhotoClient
          loaderSrc={item.photo.loaderSrc}
          alt={item.photo.alt}
          width={item.photo.width}
          height={item.photo.height}
          silhouette={silhouette}
        />
      </span>
    );
  }
  return (
    <span className="search-hit-visual">
      <Silhouette
        widthMm={dims.w}
        heightMm={dims.h}
        targetMaxPx={48}
        title={item.name}
        variant={variant}
      />
    </span>
  );
}
