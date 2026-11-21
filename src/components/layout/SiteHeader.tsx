"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useSiteChrome } from "@/components/layout/SiteChromeContext";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Container } from "@/components/ui/Container";
import { Link, usePathname } from "@/i18n/navigation";
import {
  formatNavLoad,
  type CategoryNavStat,
} from "@/lib/catalog/nav";

/** Keep in sync with the desktop nav breakpoint in globals.css. */
const DESKTOP_NAV_MQ = "(min-width: 1160px)";
const HOVER_MQ = "(hover: hover) and (pointer: fine)";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type LogoProp = {
  src: string;
  width: number;
  height: number;
};

type SiteHeaderProps = {
  categories: CategoryNavStat[];
  logo: LogoProp | null;
  /** White wordmark for `data-theme="dark"`; falls back to `logo` when null. */
  logoDark: LogoProp | null;
};

const PAGE_LINKS = [
  { href: "/#industries", key: "industries" },
  { href: "/service", key: "service" },
  { href: "/about", key: "about" },
  { href: "/contacts", key: "contacts" },
] as const;

function isCurrentPath(pathname: string, href: string): boolean {
  if (href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNodeInside(root: HTMLElement | null, target: EventTarget | null): boolean {
  return target instanceof Node && Boolean(root?.contains(target));
}

function visibleFocusable(root: ParentNode | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[hidden]") && !el.hasAttribute("disabled"),
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="nav-chevron">
      <path
        d={open ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true">
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

function MenuGlyph({ open }: { open: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

function CategoryList({
  stats,
  variant,
  onNavigate,
}: {
  stats: CategoryNavStat[];
  variant: "mega" | "stack";
  onNavigate: () => void;
}) {
  const tNav = useTranslations("nav");
  const tCat = useTranslations("categories");
  const tCatalog = useTranslations("catalog");
  const tUnits = useTranslations("units");
  const locale = useLocale();

  return (
    <ul className={variant === "mega" ? "page-grid mega-list" : "mobile-sublist"}>
      {stats.map((stat) => {
        const showLoad =
          (stat.slug === "washers" || stat.slug === "dryers") &&
          stat.loadMin !== null &&
          stat.loadMax !== null;
        return (
          <li
            key={stat.slug}
            className={variant === "mega" ? "mega-item" : undefined}
          >
            <Link
              href={`/catalog/${stat.slug}`}
              className={variant === "mega" ? "mega-link" : "mobile-sublink"}
              onClick={onNavigate}
            >
              <span className="mega-name">{tCat(stat.slug)}</span>
              <span className="mega-meta">
                {tCatalog("models", { count: stat.count })}
              </span>
              {showLoad ? (
                <span className="mega-meta">
                  {formatNavLoad(
                    stat.loadMin ?? 0,
                    stat.loadMax ?? 0,
                    locale,
                    tUnits("kg"),
                  )}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
      <li className={variant === "mega" ? "mega-all" : undefined}>
        <Link
          href="/catalog"
          className={variant === "mega" ? "mega-all-link" : "mobile-sublink"}
          onClick={onNavigate}
        >
          {tNav("allModels")}
        </Link>
      </li>
    </ul>
  );
}

export function SiteHeader({ categories, logo, logoDark }: SiteHeaderProps) {
  const tNav = useTranslations("nav");
  const tSearch = useTranslations("search");
  const pathname = usePathname();
  const { menuOpen, setMenuOpen, openSearch, searchOpen } = useSiteChrome();
  const headerRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const catalogBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const suppressFocusRef = useRef(false);
  const hoverOpenedRef = useRef(false);
  const megaOpenRef = useRef(false);
  const pinnedRef = useRef(false);

  const [stuck, setStuck] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [catalogAccOpen, setCatalogAccOpen] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [navReady, setNavReady] = useState(false);

  const catalogCurrent = isCurrentPath(pathname, "/catalog");
  const quoteCurrent = isCurrentPath(pathname, "/quote");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (searchOpen) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, [contenteditable='true'], [role='dialog']",
        )
      ) {
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        openSearch();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSearch, searchOpen]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setStuck(!entry.isIntersecting);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hover = window.matchMedia(HOVER_MQ);
    const desktop = window.matchMedia(DESKTOP_NAV_MQ);
    const sync = () => {
      setNavReady(true);
      setCanHover(hover.matches);
      if (desktop.matches) setMenuOpen(false);
      else {
        megaOpenRef.current = false;
        pinnedRef.current = false;
        setMegaOpen(false);
      }
    };
    sync();
    hover.addEventListener("change", sync);
    desktop.addEventListener("change", sync);
    return () => {
      hover.removeEventListener("change", sync);
      desktop.removeEventListener("change", sync);
    };
  }, [setMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const main = document.getElementById("main");
    const footer = document.querySelector("footer");
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");
    const root = document.documentElement;
    const prevHtml = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
      root.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [menuOpen, setMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const panel = menuRef.current;
    const toggle = menuBtnRef.current;
    const cycle = () =>
      [toggle, ...visibleFocusable(panel)].filter(
        (el): el is HTMLElement => el instanceof HTMLElement,
      );
    visibleFocusable(panel)[0]?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        setCatalogAccOpen(false);
        toggle?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const list = cycle();
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
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, setMenuOpen]);

  useEffect(() => {
    if (!megaOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (isNodeInside(headerRef.current, event.target)) return;
      hoverOpenedRef.current = false;
      pinnedRef.current = false;
      megaOpenRef.current = false;
      setMegaOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [megaOpen]);

  function closeMega() {
    hoverOpenedRef.current = false;
    pinnedRef.current = false;
    megaOpenRef.current = false;
    setMegaOpen(false);
  }

  function openMega(pin: boolean) {
    megaOpenRef.current = true;
    setMegaOpen(true);
    if (!pin) return;
    pinnedRef.current = true;
  }

  function onCatalogEnter() {
    if (!canHover) return;
    if (!megaOpenRef.current) hoverOpenedRef.current = true;
    openMega(false);
  }

  function onCatalogClick() {
    if (hoverOpenedRef.current) {
      hoverOpenedRef.current = false;
      openMega(true);
      return;
    }
    if (megaOpenRef.current) closeMega();
    else openMega(true);
  }

  function onCatalogFocus() {
    if (suppressFocusRef.current) {
      suppressFocusRef.current = false;
      return;
    }
    openMega(false);
  }

  function onCatalogBlur(event: FocusEvent<HTMLDivElement>) {
    if (isNodeInside(catalogRef.current, event.relatedTarget)) return;
    closeMega();
  }

  function onCatalogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || !megaOpen) return;
    event.preventDefault();
    event.stopPropagation();
    const button = catalogBtnRef.current;
    closeMega();
    if (button && document.activeElement !== button) {
      suppressFocusRef.current = true;
      button.focus();
    }
  }

  function onHeaderMouseLeave() {
    if (pinnedRef.current) return;
    if (isNodeInside(catalogRef.current, document.activeElement)) return;
    hoverOpenedRef.current = false;
    megaOpenRef.current = false;
    setMegaOpen(false);
  }

  function onDesktopNavMouseOver(event: ReactMouseEvent<HTMLElement>) {
    if (!canHover || pinnedRef.current) return;
    const anchor = catalogRef.current;
    if (!anchor || isNodeInside(anchor, event.target)) return;
    if (isNodeInside(anchor, document.activeElement)) return;
    hoverOpenedRef.current = false;
    megaOpenRef.current = false;
    setMegaOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
    setCatalogAccOpen(false);
  }

  const brand = tNav("brand");

  return (
    <>
      <div ref={sentinelRef} className="header-sentinel no-print" aria-hidden="true" />
      <header
        ref={headerRef}
        className={stuck ? "site-header is-stuck" : "site-header"}
        data-nav-ready={navReady ? "true" : undefined}
        onMouseLeave={onHeaderMouseLeave}
      >
        {/* Blur lives on this layer, not the header, so the mobile dialog stays viewport-fixed. */}
        <div className="site-header-bg" aria-hidden="true" />
        <Container className="site-header-bar">
          <Link href="/" className="site-brand" translate="no">
            {logo ? (
              <span className="site-brand-logos">
                <span className="site-brand-logo site-brand-logo--light">
                  <Image
                    src={logo.src}
                    alt={brand}
                    width={logo.width}
                    height={logo.height}
                    priority
                  />
                </span>
                <span className="site-brand-logo site-brand-logo--dark" aria-hidden>
                  <Image
                    src={(logoDark ?? logo).src}
                    alt=""
                    width={(logoDark ?? logo).width}
                    height={(logoDark ?? logo).height}
                    priority
                  />
                </span>
              </span>
            ) : (
              brand
            )}
          </Link>

          <nav
            aria-label={tNav("mainNav")}
            className="site-nav-desktop"
            onMouseOver={onDesktopNavMouseOver}
          >
            <div
              className="catalog-anchor"
              ref={catalogRef}
              onMouseEnter={onCatalogEnter}
              onFocus={onCatalogFocus}
              onBlur={onCatalogBlur}
              onKeyDown={onCatalogKeyDown}
            >
              <button
                ref={catalogBtnRef}
                type="button"
                className="site-nav-link"
                aria-expanded={megaOpen}
                aria-controls="catalog-mega"
                aria-current={catalogCurrent ? "page" : undefined}
                onClick={onCatalogClick}
              >
                {tNav("catalog")}
                <Chevron open={megaOpen} />
              </button>
              <div
                id="catalog-mega"
                className="mega"
                role="region"
                aria-label={tNav("catalog")}
                hidden={!megaOpen}
              >
                <Container>
                  <CategoryList
                    stats={categories}
                    variant="mega"
                    onNavigate={closeMega}
                  />
                </Container>
              </div>
            </div>
            {PAGE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="site-nav-link"
                aria-current={
                  isCurrentPath(pathname, item.href) ? "page" : undefined
                }
              >
                {tNav(item.key)}
              </Link>
            ))}
          </nav>

          <div className="site-header-actions">
            <button
              type="button"
              className="header-search header-tool"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              aria-label={tSearch("open")}
              onClick={openSearch}
            >
              <SearchGlyph />
              <span className="header-search-hint">{tSearch("shortcut")}</span>
            </button>
            <LocaleSwitcher />
            <ThemeToggle />
            <Link
              href="/quote"
              className="btn btn-red header-quote"
              aria-current={quoteCurrent ? "page" : undefined}
            >
              {tNav("quote")}
            </Link>
            <button
              ref={menuBtnRef}
              type="button"
              className="menu-toggle header-tool"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? tNav("closeMenu") : tNav("menu")}
              onClick={() => {
                setCatalogAccOpen(false);
                setMenuOpen(!menuOpen);
              }}
            >
              <MenuGlyph open={menuOpen} />
            </button>
          </div>
        </Container>

        <div
          ref={menuRef}
          id="mobile-menu"
          className="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={tNav("menu")}
          hidden={!menuOpen}
        >
          <Container className="mobile-menu-inner">
            <nav aria-label={tNav("mainNav")}>
              <div className="mobile-acc">
                <button
                  type="button"
                  className="site-nav-link"
                  aria-expanded={catalogAccOpen}
                  aria-controls="mobile-catalog"
                  aria-current={catalogCurrent ? "page" : undefined}
                  onClick={() => setCatalogAccOpen((open) => !open)}
                >
                  {tNav("catalog")}
                  <Chevron open={catalogAccOpen} />
                </button>
                <div id="mobile-catalog" hidden={!catalogAccOpen}>
                  <CategoryList
                    stats={categories}
                    variant="stack"
                    onNavigate={closeMenu}
                  />
                </div>
              </div>
              {PAGE_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="site-nav-link"
                  aria-current={
                    isCurrentPath(pathname, item.href) ? "page" : undefined
                  }
                  onClick={closeMenu}
                >
                  {tNav(item.key)}
                </Link>
              ))}
            </nav>
            <Link
              href="/quote"
              className="btn btn-red mobile-quote"
              aria-current={quoteCurrent ? "page" : undefined}
              onClick={closeMenu}
            >
              {tNav("quote")}
            </Link>
          </Container>
        </div>
      </header>
    </>
  );
}
