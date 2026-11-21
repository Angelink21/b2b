"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSiteChrome } from "@/components/layout/SiteChromeContext";
import { telHref, visibleMessengers, visiblePhones } from "@/config/site";
import { Link, usePathname } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics/track";

const MOBILE_BAR_MQ = "(max-width: 768px)";
const SCROLL_THRESHOLD = 12;

function PhoneGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5.5 3.5h3l1.5 4-2 1.5a9 9 0 004 4l1.5-2 4 1.5v3A11 11 0 015.5 3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MobileActionBar() {
  const t = useTranslations("mobileBar");
  const pathname = usePathname();
  const { menuOpen, searchOpen, formFocused, setFormFocused } = useSiteChrome();
  const phones = visiblePhones();
  const messengers = visibleMessengers();
  const primaryPhone = phones[0] ?? null;
  const primaryMessenger = messengers[0] ?? null;

  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [compareOffset, setCompareOffset] = useState(0);
  const lastScrollRef = useRef(0);

  const hiddenRoute = useMemo(() => {
    if (pathname === "/quote" || pathname === "/contacts") return true;
    return false;
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_BAR_MQ);
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const measureCompareTray = useCallback(() => {
    const tray = document.querySelector<HTMLElement>(".compare-tray");
    if (!tray || tray.offsetParent === null) {
      setCompareOffset(0);
      return;
    }
    setCompareOffset(tray.getBoundingClientRect().height);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => measureCompareTray());
    const observer = new MutationObserver(measureCompareTray);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
    window.addEventListener("resize", measureCompareTray);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measureCompareTray);
    };
  }, [measureCompareTray, pathname]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollRef.current;
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;
      setVisible(delta < 0 || y < 80);
      lastScrollRef.current = y;
    };
    lastScrollRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const barActive =
    enabled && !hiddenRoute && !menuOpen && !searchOpen && !formFocused;

  useEffect(() => {
    document.body.classList.toggle("has-mobile-action-bar", barActive);
    return () => document.body.classList.remove("has-mobile-action-bar");
  }, [barActive]);

  useEffect(() => {
    if (!enabled) return;
    function onFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const inForm = Boolean(
        target.closest("form, [role='dialog'], .catalog-panel.is-open"),
      );
      if (inForm) setFormFocused(true);
    }
    function onFocusOut() {
      window.setTimeout(() => {
        const active = document.activeElement;
        const inForm =
          active instanceof HTMLElement &&
          Boolean(active.closest("form, [role='dialog'], .catalog-panel.is-open"));
        if (!inForm) setFormFocused(false);
      }, 0);
    }
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [enabled, setFormFocused]);

  if (!barActive) return null;

  return (
    <div
      className={
        visible ? "mobile-action-bar is-visible" : "mobile-action-bar is-hidden"
      }
      role="region"
      aria-label={t("label")}
      style={{ bottom: compareOffset }}
    >
      <div className="mobile-action-bar-inner">
        <Link
          href="/quote"
          className="btn btn-red mobile-action-bar-quote"
          onClick={() => trackEvent("mobile_bar_quote")}
        >
          {t("quote")}
        </Link>
        {primaryPhone ? (
          <a
            href={telHref(primaryPhone)}
            className="btn btn-secondary mobile-action-bar-call"
            onClick={() => trackEvent("mobile_bar_call")}
          >
            <PhoneGlyph />
            <span>{t("call")}</span>
          </a>
        ) : null}
        {primaryMessenger ? (
          <a
            href={primaryMessenger.href}
            className="btn btn-secondary mobile-action-bar-messenger"
            rel="noopener noreferrer"
            target="_blank"
            onClick={() => trackEvent("mobile_bar_messenger")}
          >
            {primaryMessenger.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}